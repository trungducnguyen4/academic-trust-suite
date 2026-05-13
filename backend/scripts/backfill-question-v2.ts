/*
	Backfill script: migrate legacy questions data into v2 tables using batch/cursor.
	Run AFTER applying phase-01 expand schema.

	Example:
	DATABASE_URL="mysql://..." npx ts-node scripts/backfill-question-v2.ts

	Optional env:
	- BACKFILL_BATCH_SIZE=200
	- BACKFILL_START_CURSOR=<questionId>
	- BACKFILL_DRY_RUN=1
*/

declare const require: any;
declare const process: any;

// Use generated Prisma client from workspace root node_modules (same pattern as PrismaService)
const { PrismaClient } = require('../../node_modules/@prisma/client');

const prisma = new PrismaClient({
	datasources: {
		db: {
			url: process.env.DATABASE_URL,
		},
	},
});
const BATCH_SIZE = Number(process.env.BACKFILL_BATCH_SIZE || 200);
const START_CURSOR = process.env.BACKFILL_START_CURSOR || '';
const DRY_RUN = process.env.BACKFILL_DRY_RUN === '1';

type LegacyQuestion = {
	id: string;
	type: string;
	content: string;
	options: any;
	correctAnswer: any;
	explanation: string | null;
	difficulty: number | null;
	points: number | null;
	courseId: string | null;
	courseId: string | null;
	creatorId: string | null;
	createdAt: Date;
};

async function fetchBatch(cursorId?: string): Promise<LegacyQuestion[]> {
	if (!cursorId) {
		const rows = await prisma.$queryRawUnsafe(
			`
			SELECT id, type, content, options, correctAnswer, explanation, difficulty, points, courseId, creatorId, createdAt
			FROM questions
			ORDER BY id ASC
			LIMIT ?
			`,
			BATCH_SIZE,
		);
		return rows as LegacyQuestion[];
	}

	const rows = await prisma.$queryRawUnsafe(
		`
		SELECT id, type, content, options, correctAnswer, explanation, difficulty, points, courseId, creatorId, createdAt
		FROM questions
		WHERE id > ?
		ORDER BY id ASC
		LIMIT ?
		`,
		cursorId,
		BATCH_SIZE,
	);

	return rows as LegacyQuestion[];
}

async function ensureVersionOne(q: LegacyQuestion) {
	await prisma.$executeRawUnsafe(
		`
		INSERT INTO question_versions
			(id, questionId, versionNo, stem, payload, answerKey, explanation, difficulty, points, metadata, aiGenerated, createdBy, createdAt)
		SELECT
			UUID(), ?, 1, ?, ?, ?, ?, ?, ?, JSON_OBJECT('legacyType', ?), 0, ?, ?
		FROM DUAL
		WHERE NOT EXISTS (
			SELECT 1 FROM question_versions WHERE questionId = ? AND versionNo = 1
		)
		`,
		q.id,
		q.content,
		JSON.stringify(q.options ?? {}),
		JSON.stringify(q.correctAnswer ?? {}),
		q.explanation,
		q.difficulty,
		q.points,
		q.type,
		q.creatorId,
		q.createdAt,
		q.id,
	);
}

async function getVersionOneId(questionId: string): Promise<string | null> {
	const rows = await prisma.$queryRawUnsafe(
		`SELECT id FROM question_versions WHERE questionId = ? AND versionNo = 1 LIMIT 1`,
		questionId,
	) as Array<{ id: string }>;

	return rows.length > 0 ? rows[0].id : null;
}

// tags removed from schema; tag upserts are no-ops


async function upsertCourseScope(questionId: string, courseId: string | null) {
	if (!courseId) return;

	await prisma.$executeRawUnsafe(
		`
		INSERT INTO question_course_scopes (questionId, courseId)
		VALUES (?, ?)
		ON DUPLICATE KEY UPDATE questionId = VALUES(questionId)
		`,
		questionId,
		courseId,
	);
}

async function backfillUsageLinks(questionId: string, versionId: string) {
	await prisma.$executeRawUnsafe(
		`
		UPDATE exam_questions
		SET questionVersionId = ?
		WHERE questionId = ? AND questionVersionId IS NULL
		`,
		versionId,
		questionId,
	);

	await prisma.$executeRawUnsafe(
		`
		UPDATE submission_answers
		SET questionVersionId = ?
		WHERE questionId = ? AND questionVersionId IS NULL
		`,
		versionId,
		questionId,
	);
}

async function updateQuestionV2Meta(questionId: string) {
	await prisma.$executeRawUnsafe(
		`
		UPDATE questions
		SET latestVersionNo = CASE WHEN latestVersionNo < 1 THEN 1 ELSE latestVersionNo END,
				status = CASE WHEN status IS NULL OR status = '' THEN 'PUBLISHED' ELSE status END,
				isReusable = 1
		WHERE id = ?
		`,
		questionId,
	);
}

async function processQuestion(q: LegacyQuestion) {
	if (DRY_RUN) return;

	await prisma.$transaction(async () => {
		await ensureVersionOne(q);

		const versionId = await getVersionOneId(q.id);
		if (!versionId) {
			throw new Error(`Unable to load version 1 for question ${q.id}`);
		}

		// tags removed from schema - nothing to upsert
		await upsertCourseScope(q.id, q.courseId);
		await backfillUsageLinks(q.id, versionId);
		await updateQuestionV2Meta(q.id);
	});
}

async function main() {
	let cursor = START_CURSOR || '';
	let total = 0;
	let batchNo = 0;

	console.log(`[backfill] start dryRun=${DRY_RUN} batchSize=${BATCH_SIZE} cursor=${cursor || 'START'}`);

	while (true) {
		const batch = await fetchBatch(cursor || undefined);
		if (batch.length === 0) break;

		batchNo += 1;
		for (const q of batch) {
			await processQuestion(q);
			total += 1;
			cursor = q.id;
		}

		console.log(`[backfill] batch=${batchNo} size=${batch.length} total=${total} cursor=${cursor}`);
	}

	console.log(`[backfill] done total=${total} lastCursor=${cursor || 'END'}`);
}

main()
	.catch((err) => {
		console.error('[backfill] failed', err);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
