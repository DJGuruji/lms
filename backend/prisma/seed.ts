/**
 * Demo data for local development. Refuses to run unless NODE_ENV=development.
 * Run: npx prisma db seed   (after: npx prisma generate)
 */
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { Prisma, PrismaClient } from '@prisma/client';

const DEMO_SUBDOMAIN = 'lms-demo-seed';
const DEMO_PASSWORD = 'SeedDemo#1';
const BCRYPT_ROUNDS = 12;

const SEED_CREATE_SUPER_ADMIN =
  (process.env.SEED_CREATE_SUPER_ADMIN ?? '').toLowerCase() === 'true';
const SEED_CREATE_ADMIN =
  (process.env.SEED_CREATE_ADMIN ?? '').toLowerCase() === 'true';

async function main() {
  if (process.env.NODE_ENV !== 'development') {
    console.error(
      '[seed] Aborted: only runs when NODE_ENV is "development".',
    );
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('[seed] DATABASE_URL is not set.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const existing = await prisma.institute.findUnique({
      where: { subdomain: DEMO_SUBDOMAIN },
      select: { id: true },
    });

    if (existing) {
      const iid = existing.id;
      await prisma.result.deleteMany({
        where: { exam: { course: { instituteId: iid } } },
      });
      await prisma.question.deleteMany({
        where: { exam: { course: { instituteId: iid } } },
      });
      await prisma.exam.deleteMany({
        where: { course: { instituteId: iid } },
      });
      await prisma.content.deleteMany({
        where: { subject: { course: { instituteId: iid } } },
      });
      await prisma.subject.deleteMany({
        where: { course: { instituteId: iid } },
      });
      await prisma.enrollment.deleteMany({
        where: { course: { instituteId: iid } },
      });
      await prisma.course.deleteMany({ where: { instituteId: iid } });
      await prisma.user.deleteMany({ where: { instituteId: iid } });
      await prisma.institute.delete({ where: { id: iid } });
      console.log('[seed] Removed previous demo institute.');
    }

    const hashed = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

    const institute = await prisma.institute.create({
      data: {
        name: 'LMS Demo Institute',
        subdomain: DEMO_SUBDOMAIN,
      },
    });

    if (SEED_CREATE_SUPER_ADMIN) {
      await prisma.user.create({
        data: {
          name: 'Demo Super Admin',
          email: `nath93266@gmail.com`,
          password: hashed,
          role: 'SUPER_ADMIN',
          instituteId: institute.id,
        },
        select: { id: true },
      });
    }

    if (SEED_CREATE_ADMIN) {
      await prisma.user.create({
        data: {
          name: 'Demo Admin',
          email: `admin@${DEMO_SUBDOMAIN}.local`,
          password: hashed,
          role: 'ADMIN',
          instituteId: institute.id,
        },
        select: { id: true },
      });
    }

    const teacher = await prisma.user.create({
      data: {
        name: 'Demo Teacher',
        email: `teacher@${DEMO_SUBDOMAIN}.local`,
        password: hashed,
        role: 'TEACHER',
        instituteId: institute.id,
      },
      select: { id: true, email: true },
    });

    const student = await prisma.user.create({
      data: {
        name: 'Demo Student',
        email: `student@${DEMO_SUBDOMAIN}.local`,
        password: hashed,
        role: 'STUDENT',
        instituteId: institute.id,
      },
      select: { id: true, email: true },
    });

    const course = await prisma.course.create({
      data: {
        name: 'Web Foundations',
        instituteId: institute.id,
      },
    });

    const subHtml = await prisma.subject.create({
      data: { name: 'HTML basics', courseId: course.id },
    });

    const subCss = await prisma.subject.create({
      data: { name: 'CSS basics', courseId: course.id },
    });

    await prisma.content.createMany({
      data: [
        {
          title: 'Sample PDF lesson',
          type: 'PDF',
          fileUrl:
            'https://www.w3.org/WAI/WCAG21/working-examples/pdf-note/note.pdf',
          subjectId: subHtml.id,
        },
        {
          title: 'Sample video lesson',
          type: 'Video',
          fileUrl:
            'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm',
          subjectId: subCss.id,
        },
      ],
    });

    await prisma.enrollment.create({
      data: {
        studentId: student.id,
        courseId: course.id,
      },
    });

    const exam = await prisma.exam.create({
      data: {
        title: 'Week 1 — Check-in quiz',
        courseId: course.id,
        duration: 3600,
      },
    });

    await prisma.question.create({
      data: {
        examId: exam.id,
        question: 'HTML is mainly used for?',
        options: ['Styling', 'Structure', 'Database', 'Routing'] as unknown as Prisma.InputJsonValue,
        answer: 'Structure',
      },
    });

    await prisma.question.create({
      data: {
        examId: exam.id,
        question:
          'Which language describes presentation of a web page?',
        options: ['HTML', 'SQL', 'CSS', 'C'] as unknown as Prisma.InputJsonValue,
        answer: 'CSS',
      },
    });

    console.log('[seed] Demo institute:', institute.subdomain);
    if (SEED_CREATE_SUPER_ADMIN) {
      console.log(
        '[seed] Super admin login:',
        `superadmin@${DEMO_SUBDOMAIN}.local`,
        '/',
        DEMO_PASSWORD,
      );
    }
    if (SEED_CREATE_ADMIN) {
      console.log(
        '[seed] Admin login:',
        `admin@${DEMO_SUBDOMAIN}.local`,
        '/',
        DEMO_PASSWORD,
      );
    }
    console.log('[seed] Teacher login:', teacher.email, '/', DEMO_PASSWORD);
    console.log('[seed] Student login:', student.email, '/', DEMO_PASSWORD);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
