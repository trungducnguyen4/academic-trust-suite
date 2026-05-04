import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import {
  AIGenerateSectionDto,
  AISection,
  ApplyAICandidateDto,
  CreateQuestionDraftDto,
  DraftPublishMode,
  DraftValidationLevel,
  PublishQuestionDraftDto,
  QuestionDraftStepKey,
  SaveDraftStepDto,
  ValidateQuestionDraftDto,
} from './dto/question-draft.dto';
import { ListQuestionsQueryDto } from './dto/question-v2-query.dto';
import { CreateQuestionCrudDto, UpdateQuestionCrudDto } from './dto/question-crud.dto';

interface AuthUser {
  id: string;
  role: 'ADMIN' | 'LECTURER' | 'STUDENT';
}

interface QuestionAccessRow {
  creatorId: string | null;
  courseId: string | null;
}

interface DraftRow {
  id: string;
  questionId: string | null;
  creatorId: string;
  mode: string;
  currentStep: string;
  autosaveVersion: number;
  state: any;
  validation: any;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class QuestionsService {
  private tableCache = new Map<string, boolean>();
  private columnCache = new Map<string, boolean>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  private parseJson(value: any, fallback: any = null) {
    if (value === null || typeof value === 'undefined') return fallback;
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(String(value));
    } catch {
      return fallback;
    }
  }

  private normalizeQuestionType(input?: string) {
    const type = String(input || 'MULTIPLE_CHOICE').trim().toUpperCase();
    const allowed = new Set([
      'MULTIPLE_CHOICE',
      'MULTI_SELECT',
      'TRUE_FALSE',
      'SHORT_ANSWER',
      'ESSAY',
      'FILL_IN_BLANK',
      'MATCHING',
      'ORDERING',
    ]);
    if (allowed.has(type)) return type;
    if (type === 'SINGLE_CHOICE') return 'MULTIPLE_CHOICE';
    return 'MULTIPLE_CHOICE';
  }

  private async hasTable(tableName: string): Promise<boolean> {
    if (this.tableCache.has(tableName)) return this.tableCache.get(tableName)!;
    const rows = await this.prisma.$queryRawUnsafe(
      `SELECT 1 AS ok FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1`,
      tableName,
    ) as Array<{ ok: number }>;
    const exists = rows.length > 0;
    this.tableCache.set(tableName, exists);
    return exists;
  }

  private async hasColumn(tableName: string, columnName: string): Promise<boolean> {
    const key = `${tableName}.${columnName}`;
    if (this.columnCache.has(key)) return this.columnCache.get(key)!;

    const rows = await this.prisma.$queryRawUnsafe(
      `SELECT 1 AS ok FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? LIMIT 1`,
      tableName,
      columnName,
    ) as Array<{ ok: number }>;

    const exists = rows.length > 0;
    this.columnCache.set(key, exists);
    return exists;
  }

  private async assertCourseAccessible(courseId: string, user: AuthUser) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, lecturerId: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (user.role === 'LECTURER' && course.lecturerId !== user.id) {
      throw new ForbiddenException('You are not allowed to use this course');
    }
  }

  private assertCanAccessQuestion(question: QuestionAccessRow, user: AuthUser) {
    if (user.role === 'ADMIN') return;
    if (user.role !== 'LECTURER' || question.creatorId !== user.id) {
      throw new ForbiddenException('You are not allowed to access this question');
    }
  }

  async createQuestion(dto: CreateQuestionCrudDto, user: AuthUser) {
    const { tags, ...questionData } = dto;

    if (questionData.courseId) {
      await this.assertCourseAccessible(questionData.courseId, user);
    } else if (user.role === 'LECTURER') {
      throw new BadRequestException('Course is required for lecturer-created questions');
    }

    return this.prisma.question.create({
      data: {
        ...questionData,
        tags: tags ? JSON.stringify(tags) : null,
        creatorId: user.id,
      },
    });
  }

  async findQuestionById(id: string, user: AuthUser) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    this.assertCanAccessQuestion(question, user);

    return {
      ...question,
      tags: this.parseJson(question.tags, []),
    };
  }

  async updateQuestion(id: string, dto: UpdateQuestionCrudDto, user: AuthUser) {
    const question = await this.prisma.question.findUnique({ where: { id } });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    this.assertCanAccessQuestion(question, user);

    const { tags, ...questionData } = dto;

    return this.prisma.question.update({
      where: { id },
      data: {
        ...questionData,
        ...(tags !== undefined && { tags: JSON.stringify(tags) }),
      },
    });
  }

  async deleteQuestion(id: string, user: AuthUser) {
    const question = await this.prisma.question.findUnique({ where: { id } });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    this.assertCanAccessQuestion(question, user);
    await this.prisma.question.delete({ where: { id } });
    return { message: 'Question deleted successfully' };
  }

  async getQuestionsByTags(tags: string[], user: AuthUser) {
    const where = user.role === 'LECTURER' ? { creatorId: user.id } : undefined;
    const questions = await this.prisma.question.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return questions
      .filter((q) => {
        const questionTags = this.parseJson(q.tags, []);
        if (!Array.isArray(questionTags)) return false;
        return tags.some((tag) => questionTags.includes(tag));
      })
      .map((q) => ({
        ...q,
        tags: this.parseJson(q.tags, []),
      }));
  }

  async getQuestionStats(user: AuthUser) {
    const where = user.role === 'LECTURER' ? { creatorId: user.id } : {};

    const [total, byType, byDifficulty] = await Promise.all([
      this.prisma.question.count({ where }),
      this.prisma.question.groupBy({
        by: ['type'],
        where,
        _count: true,
      }),
      this.prisma.question.groupBy({
        by: ['difficulty'],
        where,
        _count: true,
      }),
    ]);

    return {
      total,
      byType: byType.map((item) => ({
        type: item.type,
        count: item._count,
      })),
      byDifficulty: byDifficulty.map((item) => ({
        difficulty: item.difficulty,
        count: item._count,
      })),
    };
  }

  private async assertV2Ready() {
    const required = ['question_drafts', 'ai_generation_records', 'question_versions'];
    for (const t of required) {
      if (!(await this.hasTable(t))) {
        throw new BadRequestException(
          `Question V2 table '${t}' is missing. Apply phase-01 expand schema migration before using this endpoint.`,
        );
      }
    }
  }

  private nextStep(step: QuestionDraftStepKey): QuestionDraftStepKey {
    if (step === QuestionDraftStepKey.INTENT) return QuestionDraftStepKey.CONTENT;
    if (step === QuestionDraftStepKey.CONTENT) return QuestionDraftStepKey.ANSWERS;
    if (step === QuestionDraftStepKey.ANSWERS) return QuestionDraftStepKey.CLASSIFICATION;
    return QuestionDraftStepKey.REVIEW;
  }

  private computeCompletion(state: any) {
    const intent = !!state?.intent?.questionType;
    const content = !!String(state?.content?.content || state?.content?.stem || '').trim();

    const questionType = this.normalizeQuestionType(state?.intent?.questionType || state?.content?.type);
    const options = state?.answers?.options || {};
    const answer = state?.answers?.correctAnswer;

    const optionValues = Array.isArray(options)
      ? options
      : Object.values(options || {});

    const hasEnoughOptions = optionValues.filter((x: any) => String(x || '').trim()).length >= 2;
    const hasAnswer = !!(answer && (Array.isArray(answer) ? answer.length : Object.keys(answer || {}).length));

    const answers =
      questionType === 'ESSAY' || questionType === 'SHORT_ANSWER'
        ? !!String(state?.answers?.explanation || '').trim()
        : hasEnoughOptions && hasAnswer;

    const classification =
      Array.isArray(state?.classification?.tags)
        ? state.classification.tags.length > 0
        : !!String(state?.classification?.tags || '').trim();

    return {
      intent,
      content,
      answers,
      classification,
      review: intent && content && answers,
    };
  }

  private async fetchDraftOrThrow(draftId: string, user: AuthUser): Promise<DraftRow> {
    const rows = await this.prisma.$queryRawUnsafe(
      `SELECT id, questionId, creatorId, mode, currentStep, autosaveVersion, state, validation, createdAt, updatedAt FROM question_drafts WHERE id = ? LIMIT 1`,
      draftId,
    ) as DraftRow[];

    if (rows.length === 0) {
      throw new NotFoundException('Question draft not found');
    }

    const draft = rows[0];
    if (user.role === 'LECTURER' && draft.creatorId !== user.id) {
      throw new ForbiddenException('You are not allowed to access this draft');
    }

    draft.state = this.parseJson(draft.state, {});
    draft.validation = this.parseJson(draft.validation, null);
    return draft;
  }

  async createDraft(dto: CreateQuestionDraftDto, user: AuthUser) {
    await this.assertV2Ready();

    const draftId = randomUUID();
    const state: Record<string, any> = {
      intent: {
        questionType: this.normalizeQuestionType(dto.questionType),
        mode: dto.mode,
      },
      content: {},
      answers: {},
      classification: dto.initialContext || {},
    };

    let linkedQuestionId: string | null = null;

    if (dto.sourceQuestionId) {
      const source = await this.prisma.question.findUnique({ where: { id: dto.sourceQuestionId } });
      if (!source) {
        throw new NotFoundException('Source question not found');
      }
      if (user.role === 'LECTURER' && source.creatorId !== user.id) {
        throw new ForbiddenException('You are not allowed to duplicate this question');
      }

      linkedQuestionId = source.id;
      state.intent.questionType = this.normalizeQuestionType(source.type);
      state.content = {
        content: source.content,
      };
      state.answers = {
        options: this.parseJson(source.options, source.options || {}),
        correctAnswer: this.parseJson(source.correctAnswer, source.correctAnswer || {}),
        explanation: source.explanation || '',
      };
      state.classification = {
        ...(state.classification || {}),
        difficulty: source.difficulty,
        points: source.points,
        tags: this.parseJson(source.tags, []),
        courseScopeIds: source.courseId ? [source.courseId] : [],
      };
    }

    await this.prisma.$executeRawUnsafe(
      `
      INSERT INTO question_drafts (id, questionId, creatorId, mode, currentStep, autosaveVersion, state, validation, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, 'INTENT', 1, ?, NULL, NOW(3), NOW(3))
      `,
      draftId,
      linkedQuestionId,
      user.id,
      dto.mode,
      JSON.stringify(state),
    );

    return {
      draftId,
      questionId: linkedQuestionId,
      currentStep: QuestionDraftStepKey.INTENT,
      autosaveVersion: 1,
      state,
    };
  }

  async saveStep(draftId: string, stepKey: QuestionDraftStepKey, dto: SaveDraftStepDto, user: AuthUser) {
    await this.assertV2Ready();
    const draft = await this.fetchDraftOrThrow(draftId, user);

    if (draft.autosaveVersion !== dto.autosaveVersion) {
      throw new ConflictException('Draft has newer changes. Please reload and retry.');
    }

    const nextState = {
      ...(draft.state || {}),
      [stepKey]: dto.data,
    };

    const completion = this.computeCompletion(nextState);
    const nextVersion = draft.autosaveVersion + 1;
    const nextStep = this.nextStep(stepKey);

    await this.prisma.$executeRawUnsafe(
      `
      UPDATE question_drafts
      SET state = ?, autosaveVersion = ?, currentStep = ?, updatedAt = NOW(3)
      WHERE id = ?
      `,
      JSON.stringify(nextState),
      nextVersion,
      nextStep.toUpperCase(),
      draftId,
    );

    return {
      draftId,
      autosaveVersion: nextVersion,
      completion,
      currentStep: nextStep,
      state: nextState,
    };
  }

  private buildAIPrompt(section: AISection, state: any, instruction?: string) {
    const questionType = this.normalizeQuestionType(state?.intent?.questionType || state?.content?.type);
    const content = String(state?.content?.content || state?.content?.stem || '').trim();

    const head = [
      `Question type: ${questionType}`,
      content ? `Current stem: ${content}` : 'Current stem: not provided',
      instruction ? `Additional instruction: ${instruction}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    if (section === AISection.CONTENT) {
      return `${head}\nGenerate a better question stem.`;
    }
    if (section === AISection.ANSWERS) {
      return `${head}\nGenerate answer options and correct answer.`;
    }
    if (section === AISection.EXPLANATION) {
      return `${head}\nGenerate explanation for the correct answer.`;
    }
    return `${head}\nSuggest classification metadata: topic, learning objective, tags.`;
  }

  async aiGenerateSection(draftId: string, dto: AIGenerateSectionDto, user: AuthUser) {
    await this.assertV2Ready();
    const draft = await this.fetchDraftOrThrow(draftId, user);

    const jobId = randomUUID();

    await this.prisma.$executeRawUnsafe(
      `
      INSERT INTO ai_generation_records (id, draftId, questionVersionId, section, status, provider, model, prompt, output, safetyFlags, errorMessage, createdAt, completedAt)
      VALUES (?, ?, NULL, ?, 'RUNNING', ?, ?, ?, NULL, NULL, NULL, NOW(3), NULL)
      `,
      jobId,
      draftId,
      dto.section,
      process.env.AI_PROVIDER || 'google',
      process.env.AI_OLLAMA_MODEL || 'gemini-2.0-flash',
      JSON.stringify({
        section: dto.section,
        instruction: dto.instruction || '',
        constraints: dto.constraints || {},
      }),
    );

    try {
      const prompt = this.buildAIPrompt(dto.section, draft.state, dto.instruction);
      const result = await this.aiService.generateQuestion({
        prompt,
        questionType: this.normalizeQuestionType(draft.state?.intent?.questionType),
        difficulty: dto.constraints?.difficulty ? Math.max(0, Math.min(1, (dto.constraints.difficulty - 1) / 9)) : 0.5,
        language: dto.constraints?.language || 'en',
        useCase: 'question_bank',
      });

      const candidates: Array<Record<string, any>> = [];
      if (dto.section === AISection.CONTENT) {
        candidates.push({ id: 'cand-1', content: result.content });
      } else if (dto.section === AISection.ANSWERS) {
        candidates.push({ id: 'cand-1', options: result.options || {}, correctAnswer: result.correctAnswer || {} });
      } else if (dto.section === AISection.EXPLANATION) {
        candidates.push({ id: 'cand-1', explanation: result.explanation || '' });
      } else {
        candidates.push({
          id: 'cand-1',
          tags: result.tags || [],
          topic: result.topic || '',
          learningObjective: result.learningObjective || '',
          difficulty: result.difficulty,
        });
      }

      await this.prisma.$executeRawUnsafe(
        `
        UPDATE ai_generation_records
        SET status = 'SUCCEEDED', output = ?, completedAt = NOW(3)
        WHERE id = ?
        `,
        JSON.stringify({ candidates }),
        jobId,
      );

      return {
        jobId,
        status: 'SUCCEEDED',
        candidates,
      };
    } catch (error: any) {
      await this.prisma.$executeRawUnsafe(
        `
        UPDATE ai_generation_records
        SET status = 'FAILED', errorMessage = ?, completedAt = NOW(3)
        WHERE id = ?
        `,
        String(error?.message || error),
        jobId,
      );

      throw new BadRequestException(`AI generation failed: ${error?.message || 'Unknown error'}`);
    }
  }

  async applyAICandidate(draftId: string, dto: ApplyAICandidateDto, user: AuthUser) {
    await this.assertV2Ready();
    const draft = await this.fetchDraftOrThrow(draftId, user);

    const rows = await this.prisma.$queryRawUnsafe(
      `SELECT id, draftId, section, status, output FROM ai_generation_records WHERE id = ? LIMIT 1`,
      dto.jobId,
    ) as Array<{ id: string; draftId: string | null; section: string; status: string; output: any }>;

    if (rows.length === 0) throw new NotFoundException('AI generation job not found');
    const job = rows[0];
    if (job.draftId !== draftId) {
      throw new BadRequestException('AI job does not belong to this draft');
    }
    if (job.status !== 'SUCCEEDED') {
      throw new BadRequestException(`AI job is not ready (status=${job.status})`);
    }

    const output = this.parseJson(job.output, {});
    const candidates = Array.isArray(output?.candidates) ? output.candidates : [];
    const candidate = candidates.find((c: any) => c?.id === dto.candidateId);
    if (!candidate) {
      throw new NotFoundException('AI candidate not found');
    }

    const nextState = { ...(draft.state || {}) };

    if (dto.section === AISection.CONTENT) {
      nextState.content = {
        ...(nextState.content || {}),
        content: candidate.content || nextState.content?.content || '',
      };
    } else if (dto.section === AISection.ANSWERS) {
      nextState.answers = {
        ...(nextState.answers || {}),
        options: candidate.options || nextState.answers?.options || {},
        correctAnswer: candidate.correctAnswer || nextState.answers?.correctAnswer || {},
      };
    } else if (dto.section === AISection.EXPLANATION) {
      nextState.answers = {
        ...(nextState.answers || {}),
        explanation: candidate.explanation || nextState.answers?.explanation || '',
      };
    } else {
      nextState.classification = {
        ...(nextState.classification || {}),
        tags: candidate.tags || nextState.classification?.tags || [],
        topic: candidate.topic || nextState.classification?.topic || '',
        learningObjective: candidate.learningObjective || nextState.classification?.learningObjective || '',
        difficulty: typeof candidate.difficulty !== 'undefined'
          ? candidate.difficulty
          : nextState.classification?.difficulty,
      };
    }

    const nextVersion = draft.autosaveVersion + 1;
    await this.prisma.$executeRawUnsafe(
      `UPDATE question_drafts SET state = ?, autosaveVersion = ?, updatedAt = NOW(3) WHERE id = ?`,
      JSON.stringify(nextState),
      nextVersion,
      draftId,
    );

    return {
      draftId,
      autosaveVersion: nextVersion,
      state: nextState,
    };
  }

  async validateDraft(draftId: string, dto: ValidateQuestionDraftDto, user: AuthUser) {
    await this.assertV2Ready();
    const draft = await this.fetchDraftOrThrow(draftId, user);
    const state = draft.state || {};

    const level = dto.level || DraftValidationLevel.SOFT;
    const errors: Array<{ code: string; path: string; message: string }> = [];
    const warnings: Array<{ code: string; path: string; message: string }> = [];

    const type = this.normalizeQuestionType(state?.intent?.questionType || state?.content?.type);
    const stem = String(state?.content?.content || state?.content?.stem || '').trim();

    if (!stem) {
      errors.push({ code: 'MISSING_STEM', path: 'content.content', message: 'Question stem is required' });
    } else if (stem.length < 12) {
      warnings.push({ code: 'SHORT_STEM', path: 'content.content', message: 'Question stem is quite short' });
    }

    const options = state?.answers?.options || {};
    const correctAnswer = state?.answers?.correctAnswer || {};

    if (['MULTIPLE_CHOICE', 'MULTI_SELECT', 'TRUE_FALSE'].includes(type)) {
      const optionList = Array.isArray(options) ? options : Object.values(options || {});
      const filled = optionList.filter((x: any) => String(x || '').trim());
      if (filled.length < 2) {
        errors.push({ code: 'INSUFFICIENT_OPTIONS', path: 'answers.options', message: 'At least 2 answer options are required' });
      }

      const answerSize = Array.isArray(correctAnswer)
        ? correctAnswer.length
        : Object.keys(correctAnswer || {}).length;
      if (answerSize === 0) {
        errors.push({ code: 'MISSING_CORRECT_ANSWER', path: 'answers.correctAnswer', message: 'Correct answer is required' });
      }
    }

    const explanation = String(state?.answers?.explanation || '').trim();
    if (!explanation) {
      warnings.push({ code: 'MISSING_EXPLANATION', path: 'answers.explanation', message: 'Explanation is recommended' });
    }

    const tags = state?.classification?.tags;
    if (!Array.isArray(tags) || tags.length === 0) {
      if (level === DraftValidationLevel.STRICT) {
        errors.push({ code: 'MISSING_TAGS', path: 'classification.tags', message: 'At least one tag is required for strict validation' });
      } else {
        warnings.push({ code: 'MISSING_TAGS', path: 'classification.tags', message: 'Tags are recommended for discoverability' });
      }
    }

    const qualityScore = Math.max(0, 100 - errors.length * 18 - warnings.length * 6);
    const valid = errors.length === 0;

    const validationResult = {
      valid,
      level,
      errors,
      warnings,
      qualityScore,
      validatedAt: new Date().toISOString(),
    };

    await this.prisma.$executeRawUnsafe(
      `UPDATE question_drafts SET validation = ?, updatedAt = NOW(3) WHERE id = ?`,
      JSON.stringify(validationResult),
      draftId,
    );

    return validationResult;
  }

  private normalizeLegacyTags(tags: any): string[] {
    if (Array.isArray(tags)) {
      return tags.map((t) => String(t).trim()).filter(Boolean);
    }
    if (typeof tags === 'string') {
      return tags.split(',').map((t) => t.trim()).filter(Boolean);
    }
    return [];
  }

  private normalizeDifficultyRaw(input: any): number {
    const n = Number(input);
    if (Number.isNaN(n)) return 5;
    if (n <= 1) return Math.max(1, Math.min(10, Math.round(n * 10)));
    return Math.max(1, Math.min(10, Math.round(n)));
  }

  async listTags(params?: { search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(params?.page || 1));
    const limit = Math.max(1, Math.min(100, Number(params?.limit || 20)));
    const search = String(params?.search || '').trim();

    if (await this.hasTable('tags')) {
      const whereClause = search ? 'WHERE t.name LIKE ?' : '';
      const argsForWhere = search ? [`%${search}%`] : [];

      const countRows = await this.prisma.$queryRawUnsafe(
        `SELECT COUNT(*) AS total FROM tags t ${whereClause}`,
        ...argsForWhere,
      ) as Array<{ total: bigint | number }>;

      const rows = await this.prisma.$queryRawUnsafe(
        `
        SELECT t.id, t.name, t.createdAt
        FROM tags t
        ${whereClause}
        ORDER BY t.name ASC
        LIMIT ? OFFSET ?
        `,
        ...argsForWhere,
        limit,
        (page - 1) * limit,
      ) as Array<{ id: string; name: string; createdAt: Date }>;

      const total = Number(countRows?.[0]?.total || 0);
      return {
        data: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    // Legacy fallback when tags table does not exist yet.
    const legacyRows = await this.prisma.question.findMany({
      where: { tags: { not: null } },
      select: { tags: true },
      orderBy: { updatedAt: 'desc' },
      take: 2000,
    });

    const unique = new Set<string>();
    for (const row of legacyRows) {
      const parsed = this.parseJson(row.tags, []);
      if (Array.isArray(parsed)) {
        parsed.forEach((t) => {
          const tag = String(t || '').trim();
          if (tag) unique.add(tag);
        });
      }
    }

    let all = Array.from(unique).map((name) => ({ id: name, name, createdAt: null }));
    if (search) {
      const keyword = search.toLowerCase();
      all = all.filter((x) => x.name.toLowerCase().includes(keyword));
    }

    all.sort((a, b) => a.name.localeCompare(b.name));
    const total = all.length;
    const data = all.slice((page - 1) * limit, page * limit);
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createOrGetTag(name: string) {
    const normalized = String(name || '').trim();
    if (!normalized) {
      throw new BadRequestException('Tag name is required');
    }

    if (!(await this.hasTable('tags'))) {
      throw new BadRequestException('Tags table is unavailable. Apply phase-01 schema first.');
    }

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO tags (id, name, createdAt) VALUES (UUID(), ?, NOW(3)) ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      normalized,
    );

    const rows = await this.prisma.$queryRawUnsafe(
      `SELECT id, name, createdAt FROM tags WHERE name = ? LIMIT 1`,
      normalized,
    ) as Array<{ id: string; name: string; createdAt: Date }>;

    if (rows.length === 0) {
      throw new BadRequestException('Failed to create tag');
    }

    return rows[0];
  }

  async listTopics(params?: { search?: string; page?: number; limit?: number; courseId?: string }) {
    const page = Math.max(1, Number(params?.page || 1));
    const limit = Math.max(1, Math.min(100, Number(params?.limit || 20)));
    const search = String(params?.search || '').trim();
    const courseId = String(params?.courseId || '').trim();

    if (!(await this.hasTable('topics'))) {
      return {
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const where: string[] = [];
    const args: any[] = [];

    if (search) {
      where.push('(t.code LIKE ? OR t.name LIKE ?)');
      args.push(`%${search}%`, `%${search}%`);
    }

    if (courseId && (await this.hasTable('course_topics'))) {
      where.push('EXISTS (SELECT 1 FROM course_topics ct WHERE ct.topicId = t.id AND ct.courseId = ?)');
      args.push(courseId);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const countRows = await this.prisma.$queryRawUnsafe(
      `SELECT COUNT(*) AS total FROM topics t ${whereClause}`,
      ...args,
    ) as Array<{ total: bigint | number }>;

    const rows = await this.prisma.$queryRawUnsafe(
      `
      SELECT t.id, t.code, t.name, t.createdAt
      FROM topics t
      ${whereClause}
      ORDER BY t.code ASC, t.name ASC
      LIMIT ? OFFSET ?
      `,
      ...args,
      limit,
      (page - 1) * limit,
    ) as Array<{ id: string; code: string; name: string; createdAt: Date }>;

    const total = Number(countRows?.[0]?.total || 0);
    return {
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createOrGetTopic(input: { code: string; name: string }) {
    const code = String(input?.code || '').trim();
    const name = String(input?.name || '').trim();
    if (!code || !name) {
      throw new BadRequestException('Topic code and name are required');
    }

    if (!(await this.hasTable('topics'))) {
      throw new BadRequestException('Topics table is unavailable. Apply phase-01 schema first.');
    }

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO topics (id, code, name, createdAt) VALUES (UUID(), ?, ?, NOW(3)) ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      code,
      name,
    );

    const rows = await this.prisma.$queryRawUnsafe(
      `SELECT id, code, name, createdAt FROM topics WHERE code = ? LIMIT 1`,
      code,
    ) as Array<{ id: string; code: string; name: string; createdAt: Date }>;

    if (rows.length === 0) {
      throw new BadRequestException('Failed to create topic');
    }

    return rows[0];
  }

  async setCourseTopics(courseId: string, topicIds: string[]) {
    const normalizedCourseId = String(courseId || '').trim();
    if (!normalizedCourseId) {
      throw new BadRequestException('courseId is required');
    }

    const course = await this.prisma.course.findUnique({ where: { id: normalizedCourseId }, select: { id: true } });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (!(await this.hasTable('course_topics'))) {
      throw new BadRequestException('CourseTopics table is unavailable. Apply phase-01 schema first.');
    }

    const cleanTopicIds = Array.from(new Set((topicIds || []).map((x) => String(x).trim()).filter(Boolean)));

    await this.prisma.$transaction(async () => {
      await this.prisma.$executeRawUnsafe(`DELETE FROM course_topics WHERE courseId = ?`, normalizedCourseId);
      for (const topicId of cleanTopicIds) {
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO course_topics (courseId, topicId) VALUES (?, ?) ON DUPLICATE KEY UPDATE courseId = VALUES(courseId)`,
          normalizedCourseId,
          topicId,
        );
      }
    });

    return {
      courseId: normalizedCourseId,
      topicIds: cleanTopicIds,
      count: cleanTopicIds.length,
    };
  }

  private async fetchFilteredQuestionIds(query: ListQuestionsQueryDto, user: AuthUser, page: number, limit: number) {
    const where: string[] = [];
    const args: any[] = [];

    if (user.role === 'LECTURER') {
      where.push('q.creatorId = ?');
      args.push(user.id);
    }

    if (query.type) {
      where.push('q.type = ?');
      args.push(this.normalizeQuestionType(query.type));
    }

    if (query.difficulty) {
      where.push('q.difficulty = ?');
      args.push(Number(query.difficulty));
    }

    if (query.search) {
      where.push('q.content LIKE ?');
      args.push(`%${query.search}%`);
    }

    if (await this.hasColumn('questions', 'status')) {
      where.push('q.status = ?');
      args.push(query.status || 'PUBLISHED');
    }

    if (query.courseId) {
      if (await this.hasTable('question_course_scopes')) {
        where.push('EXISTS (SELECT 1 FROM question_course_scopes qcs WHERE qcs.questionId = q.id AND qcs.courseId = ?)');
        args.push(query.courseId);
      } else {
        where.push('q.courseId = ?');
        args.push(query.courseId);
      }
    }

    if (query.tagId) {
      if (!(await this.hasTable('question_tags'))) {
        throw new BadRequestException('QuestionTags table is unavailable. Apply phase-01 schema first.');
      }
      where.push('EXISTS (SELECT 1 FROM question_tags qt WHERE qt.questionId = q.id AND qt.tagId = ?)');
      args.push(query.tagId);
    }

    if (query.topicId) {
      if (!(await this.hasTable('question_topics'))) {
        throw new BadRequestException('QuestionTopics table is unavailable. Apply phase-01 schema first.');
      }
      where.push('EXISTS (SELECT 1 FROM question_topics qtp WHERE qtp.questionId = q.id AND qtp.topicId = ?)');
      args.push(query.topicId);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const countRows = await this.prisma.$queryRawUnsafe(
      `SELECT COUNT(*) AS total FROM questions q ${whereClause}`,
      ...args,
    ) as Array<{ total: bigint | number }>;

    const idRows = await this.prisma.$queryRawUnsafe(
      `
      SELECT q.id
      FROM questions q
      ${whereClause}
      ORDER BY q.updatedAt DESC
      LIMIT ? OFFSET ?
      `,
      ...args,
      limit,
      (page - 1) * limit,
    ) as Array<{ id: string }>;

    return {
      ids: idRows.map((r) => r.id),
      total: Number(countRows?.[0]?.total || 0),
    };
  }

  async publishDraft(draftId: string, dto: PublishQuestionDraftDto, user: AuthUser) {
    await this.assertV2Ready();
    const draft = await this.fetchDraftOrThrow(draftId, user);

    if (draft.autosaveVersion !== dto.expectedAutosaveVersion) {
      throw new ConflictException('Draft has newer changes. Please reload and retry publish.');
    }

    const validation = await this.validateDraft(
      draftId,
      { level: DraftValidationLevel.STRICT },
      user,
    );

    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Draft validation failed',
        errors: validation.errors,
      });
    }

    const state = draft.state || {};
    const type = this.normalizeQuestionType(state?.intent?.questionType || state?.content?.type);
    const content = String(state?.content?.content || state?.content?.stem || '').trim();
    const options = state?.answers?.options || {};
    const correctAnswer = state?.answers?.correctAnswer || {};
    const explanation = String(state?.answers?.explanation || '').trim() || null;
    const difficulty = this.normalizeDifficultyRaw(state?.classification?.difficulty);
    const points = Math.max(1, Number(state?.classification?.points || 1));
    const tags = this.normalizeLegacyTags(state?.classification?.tags || []);

    const courseScopeIds = Array.isArray(state?.classification?.courseScopeIds)
      ? state.classification.courseScopeIds.map((x: any) => String(x)).filter(Boolean)
      : [];

    const legacyCourseId = courseScopeIds.length > 0 ? courseScopeIds[0] : null;

    let questionId = draft.questionId;

    if (questionId) {
      const existing = await this.prisma.question.findUnique({ where: { id: questionId } });
      if (!existing) throw new NotFoundException('Linked question not found');

      await this.prisma.question.update({
        where: { id: questionId },
        data: {
          type,
          content,
          options,
          correctAnswer,
          explanation,
          difficulty,
          points,
          tags: JSON.stringify(tags),
          courseId: legacyCourseId,
        },
      });
    } else {
      const created = await this.prisma.question.create({
        data: {
          type,
          content,
          options,
          correctAnswer,
          explanation,
          difficulty,
          points,
          tags: JSON.stringify(tags),
          courseId: legacyCourseId,
          creatorId: user.id,
        },
      });
      questionId = created.id;
    }

    const versionRows = await this.prisma.$queryRawUnsafe(
      `SELECT COALESCE(MAX(versionNo), 0) + 1 AS nextVersionNo FROM question_versions WHERE questionId = ?`,
      questionId,
    ) as Array<{ nextVersionNo: number }>;

    const versionNo = Number(versionRows?.[0]?.nextVersionNo || 1);
    const versionId = randomUUID();

    await this.prisma.$executeRawUnsafe(
      `
      INSERT INTO question_versions (id, questionId, versionNo, stem, payload, answerKey, explanation, difficulty, points, metadata, aiGenerated, createdBy, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3))
      `,
      versionId,
      questionId,
      versionNo,
      content,
      JSON.stringify(options || {}),
      JSON.stringify(correctAnswer || {}),
      explanation,
      difficulty,
      points,
      JSON.stringify({
        learningObjective: state?.classification?.learningObjective || null,
        topic: state?.classification?.topic || null,
      }),
      0,
      user.id,
    );

    for (const tag of tags) {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO tags (id, name, createdAt) VALUES (UUID(), ?, NOW(3)) ON DUPLICATE KEY UPDATE name = VALUES(name)`,
        tag,
      );

      await this.prisma.$executeRawUnsafe(
        `
        INSERT INTO question_tags (questionId, tagId)
        SELECT ?, t.id FROM tags t WHERE t.name = ?
        ON DUPLICATE KEY UPDATE questionId = VALUES(questionId)
        `,
        questionId,
        tag,
      );
    }

    if (courseScopeIds.length > 0) {
      for (const courseId of courseScopeIds) {
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO question_course_scopes (questionId, courseId) VALUES (?, ?) ON DUPLICATE KEY UPDATE questionId = VALUES(questionId)`,
          questionId,
          courseId,
        );
      }
    }

    if (await this.hasColumn('questions', 'latestVersionNo')) {
      const status = dto.publishMode === DraftPublishMode.IN_REVIEW ? 'IN_REVIEW' : 'PUBLISHED';
      const hasStatus = await this.hasColumn('questions', 'status');
      const hasReusable = await this.hasColumn('questions', 'isReusable');

      if (hasStatus && hasReusable) {
        await this.prisma.$executeRawUnsafe(
          `UPDATE questions SET latestVersionNo = ?, status = ?, isReusable = 1, updatedAt = NOW(3) WHERE id = ?`,
          versionNo,
          status,
          questionId,
        );
      } else {
        await this.prisma.$executeRawUnsafe(
          `UPDATE questions SET latestVersionNo = ?, updatedAt = NOW(3) WHERE id = ?`,
          versionNo,
          questionId,
        );
      }
    }

    await this.prisma.$executeRawUnsafe(
      `
      UPDATE question_drafts
      SET questionId = ?, currentStep = 'REVIEW', autosaveVersion = autosaveVersion + 1, updatedAt = NOW(3)
      WHERE id = ?
      `,
      questionId,
      draftId,
    );

    return {
      questionId,
      versionId,
      versionNo,
      status: dto.publishMode === DraftPublishMode.IN_REVIEW ? 'IN_REVIEW' : 'PUBLISHED',
    };
  }

  async listQuestions(query: ListQuestionsQueryDto, user: AuthUser) {
    const page = Math.max(1, Number((query as any).page || 1));
    const limit = Math.max(1, Math.min(100, Number((query as any).limit || 20)));

    const { ids: questionIds, total } = await this.fetchFilteredQuestionIds(query, user, page, limit);

    if (questionIds.length === 0) {
      return {
        data: [],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    const items = await this.prisma.question.findMany({
      where: { id: { in: questionIds } },
      include: {
        course: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    const orderMap = new Map(questionIds.map((id, idx) => [id, idx]));
    items.sort((a: any, b: any) => (orderMap.get(a.id)! - orderMap.get(b.id)!));

    let latestVersionsMap = new Map<string, any>();
    if (questionIds.length > 0 && (await this.hasTable('question_versions'))) {
      const placeholders = questionIds.map(() => '?').join(',');
      const rows = await this.prisma.$queryRawUnsafe(
        `
        SELECT qv.id, qv.questionId, qv.versionNo, qv.stem, qv.explanation, qv.difficulty, qv.points, qv.metadata
        FROM question_versions qv
        INNER JOIN (
          SELECT questionId, MAX(versionNo) AS maxVersionNo
          FROM question_versions
          WHERE questionId IN (${placeholders})
          GROUP BY questionId
        ) latest ON latest.questionId = qv.questionId AND latest.maxVersionNo = qv.versionNo
        `,
        ...questionIds,
      ) as Array<any>;

      latestVersionsMap = new Map(rows.map((r) => [r.questionId, {
        id: r.id,
        versionNo: Number(r.versionNo),
        stem: r.stem,
        explanation: r.explanation,
        difficulty: r.difficulty,
        points: r.points,
        metadata: this.parseJson(r.metadata, null),
      }]));
    }

    let tagsByQuestionId = new Map<string, string[]>();
    if (await this.hasTable('question_tags')) {
      const placeholders = questionIds.map(() => '?').join(',');
      const rows = await this.prisma.$queryRawUnsafe(
        `
        SELECT qt.questionId, t.name
        FROM question_tags qt
        INNER JOIN tags t ON t.id = qt.tagId
        WHERE qt.questionId IN (${placeholders})
        `,
        ...questionIds,
      ) as Array<{ questionId: string; name: string }>;

      const map = new Map<string, string[]>();
      for (const r of rows) {
        if (!map.has(r.questionId)) map.set(r.questionId, []);
        map.get(r.questionId)!.push(r.name);
      }
      tagsByQuestionId = map;
    }

    const data = items.map((q: any) => ({
      id: q.id,
      type: q.type,
      content: q.content,
      explanation: q.explanation,
      difficulty: q.difficulty,
      points: q.points,
      tags: tagsByQuestionId.get(q.id) || this.parseJson(q.tags, []),
      course: q.course,
      creatorId: q.creatorId,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
      latestVersion: latestVersionsMap.get(q.id) || null,
    }));

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getJobStatus(jobId: string, user: AuthUser) {
    await this.assertV2Ready();

    const rows = await this.prisma.$queryRawUnsafe(
      `
      SELECT r.id, r.draftId, r.section, r.status, r.provider, r.model, r.output, r.safetyFlags, r.errorMessage, r.createdAt, r.completedAt, d.creatorId
      FROM ai_generation_records r
      LEFT JOIN question_drafts d ON d.id = r.draftId
      WHERE r.id = ?
      LIMIT 1
      `,
      jobId,
    ) as Array<any>;

    if (rows.length === 0) throw new NotFoundException('AI generation job not found');

    const row = rows[0];
    if (user.role === 'LECTURER' && row.creatorId && row.creatorId !== user.id) {
      throw new ForbiddenException('You are not allowed to access this AI job');
    }

    return {
      jobId: row.id,
      draftId: row.draftId,
      section: row.section,
      status: row.status,
      provider: row.provider,
      model: row.model,
      output: this.parseJson(row.output, null),
      safetyFlags: this.parseJson(row.safetyFlags, null),
      errorMessage: row.errorMessage,
      createdAt: row.createdAt,
      completedAt: row.completedAt,
    };
  }
}
