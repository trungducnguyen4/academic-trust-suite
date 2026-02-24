1. Project Overview

This project is an AI-Supported Academic Assessment System designed for production-first deployment.

The system is not a generic LMS and not a simple CRUD application.

Core characteristics:

Each student has an independent ExamInstance

Questions are versioned

AI is assistive only (never auto-publish)

Integrity tracking is first-class

Offline mode is controlled and auditable

Analytics are data-driven

Primary focus:
Stability, scalability, integrity, production readiness

2. System Boundaries
Actors

Student

Instructor

Admin

Core Domains

User Domain

Question Domain (versioned)

Exam Domain

Integrity Domain

Offline Domain

Analytics Domain

3. Architectural Principles
3.1 Production-Oriented Design

No over-engineering

Avoid research-grade complexity

Keep services modular but deployable as monolith initially

Must support horizontal scaling

3.2 Architectural Style

Logical architecture:

Client (Web)
↓
API Layer
↓
Application Services
↓
Database (PostgreSQL)
Cache (Redis)
Optional AI Service (separated)
3.3 Service Modules

Auth Service

Course Service

Question Service

Exam Service

Integrity Service

Analytics Service

Offline Service

4. Core Domain Rules (Strict)
4.1 ExamInstance Is The Center

Every student has a unique ExamInstance

No shared exam paper

Snapshot of randomized questions must be stored

Exam must NOT regenerate after refresh

Payload must be immutable after start

4.2 Question Versioning

Question content cannot be overwritten

New edits create new QuestionVersion

Question.current_version_id references active version

Old versions remain for audit

4.3 AI Governance Rules

AI can:

Generate draft questions

Estimate difficulty

Suggest replacements

AI cannot:

Auto-publish questions

Override instructor approval

Make final grading decisions for subjective answers

All AI-generated content must:

Be logged in QuestionAILog

Be reviewable

Be explicitly approved

4.4 Integrity Rules

System logs:

Tab switch

Focus change

Mouse patterns

IP address

Response time per question

System does NOT:

Automatically declare cheating

Block submission based on anomaly score

It only flags (AnomalyFlag) for instructor review.

5. Data Model Overview

Based on ERD (do not modify structure unless explicitly instructed).

5.1 User Domain

User

Course

Enrollment

Roles:

STUDENT

INSTRUCTOR

ADMIN

5.2 Question Domain

Question

QuestionVersion

QuestionStatistics

QuestionAILog

Properties:

Fully versioned

Historical safe

Metadata-driven

Analytics-ready

5.3 Exam Domain

Exam

ExamQuestion

ExamInstance

ExamAnswer

Important:

ExamInstance stores:

student_id

encrypted_payload

ip_address

anomaly_score

suspicious_flag

started_at / submitted_at

5.4 Integrity Domain

InteractionLog

AnomalyFlag

Used for:

Audit

Transparency

Dispute resolution

5.5 Offline Domain

OfflinePackage

OfflineSyncLog

Offline mode:

Pre-generated encrypted package

Sync with integrity verification

Not designed to eliminate cheating entirely

6. Critical Invariants (Do NOT Break)

Exam must not regenerate per refresh

Question content must not be overwritten

ExamInstance must be immutable after submission

AI cannot bypass instructor approval

Logs must never be deleted silently

Score recalculation must be deterministic

7. Non-Functional Constraints
Performance

API response target < 300ms

Must handle concurrent exam sessions

No blocking AI calls in exam flow

Security

JWT authentication

Rate limiting login

Audit logging required

No editing answers after submission

Scalability

Service-based modular design

Horizontal scaling ready

AI service detachable

8. Agent Implementation Guidelines

When generating code:

Prefer clean domain-layer separation

Avoid fat controllers

Use transactional boundaries for:

Exam start

Submission

Offline sync

Use optimistic locking where appropriate

Always validate ownership (student ↔ exam)

When generating database schema:

Use UUID as primary keys

Add proper foreign key constraints

Index:

exam_instance_id

question_version_id

student_id

course_id

9. What This System Is NOT

Not a generic LMS

Not just a quiz app

Not a research-only AI prototype

Not a real-time anti-cheat enforcement engine

10. Core Value Proposition

This system provides:

Independent per-student exam generation

Full behavioral logging

Question-level statistical analytics

Controlled AI assistance

Production-oriented design

Primary innovation focus:

ExamInstance isolation

Data-driven assessment quality improvement

Integrity tracking without over-automation

11. Development Priority Order

Auth + User

Course + Enrollment

Question + Versioning

Exam generation logic

ExamInstance lifecycle

Submission + grading

Integrity logging

Analytics

Offline mode

AI integration

12. Agent Operating Mode

When writing code:

Optimize for production stability

Avoid speculative abstractions

Keep domain rules explicit

Preserve auditability

Favor deterministic logic over probabilistic logic
and check basing on 3 file.txt
END OF FILE