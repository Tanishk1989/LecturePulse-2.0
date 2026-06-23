"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./config/db");
async function main() {
    const failedLectures = await db_1.prisma.lecture.findMany({
        where: { status: 'failed' }
    });
    console.log('Failed lectures count:', failedLectures.length);
    for (const lec of failedLectures) {
        const transcript = await db_1.prisma.transcript.findFirst({
            where: { lectureId: lec.id }
        });
        console.log(`Lecture: "${lec.title}" (ID: ${lec.id})`);
        console.log(`  File URL: ${lec.fileUrl}`);
        console.log(`  Lecture status: ${lec.status}`);
        console.log(`  Transcript status: ${transcript?.status}`);
        console.log(`  Transcript error: ${transcript?.errorMessage}`);
    }
}
main().catch(console.error).finally(() => db_1.prisma.$disconnect());
