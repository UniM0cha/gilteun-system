import { nanoid } from 'nanoid';
import { db } from './index.js';
import {
  worshipTypes,
  roles,
  profiles,
  commands,
  worships,
  sheets,
  drawingPaths,
} from './schema.js';

async function seed() {
  console.log('Seeding database...\n');

  // Clear all tables in reverse FK order
  db.delete(drawingPaths).run();
  db.delete(sheets).run();
  db.delete(worships).run();
  db.delete(profiles).run();
  db.delete(commands).run();
  db.delete(roles).run();
  db.delete(worshipTypes).run();
  console.log('Cleared all tables.');

  // 1. Worship Types (6)
  const worshipTypeData = [
    { id: nanoid(), name: '주일 1부 예배', color: 'blue' },
    { id: nanoid(), name: '주일 2부 예배', color: 'purple' },
    { id: nanoid(), name: '주일 3부 예배', color: 'green' },
    { id: nanoid(), name: '수요예배', color: 'orange' },
    { id: nanoid(), name: '청년예배', color: 'pink' },
    { id: nanoid(), name: '특별예배', color: 'red' },
  ];
  db.insert(worshipTypes).values(worshipTypeData).run();
  console.log(`Inserted ${worshipTypeData.length} worship types.`);

  // 2. Roles (7)
  const roleData = [
    { id: nanoid(), name: '인도자', icon: '🎤' },
    { id: nanoid(), name: '건반', icon: '🎹' },
    { id: nanoid(), name: '드럼', icon: '🥁' },
    { id: nanoid(), name: '기타', icon: '🎸' },
    { id: nanoid(), name: '베이스', icon: '🎸' },
    { id: nanoid(), name: '보컬', icon: '🎵' },
    { id: nanoid(), name: '목사님', icon: '📖' },
  ];
  db.insert(roles).values(roleData).run();
  console.log(`Inserted ${roleData.length} roles.`);

  // 3. Commands (11)
  const commandData = [
    { id: nanoid(), emoji: '1️⃣', label: '1절', isDefault: true },
    { id: nanoid(), emoji: '2️⃣', label: '2절', isDefault: true },
    { id: nanoid(), emoji: '3️⃣', label: '3절', isDefault: true },
    { id: nanoid(), emoji: '🔂', label: '한번 더', isDefault: true },
    { id: nanoid(), emoji: '🔁', label: '계속 반복', isDefault: true },
    { id: nanoid(), emoji: '▶️', label: '시작', isDefault: true },
    { id: nanoid(), emoji: '⏹️', label: '정지', isDefault: true },
    { id: nanoid(), emoji: '⏭️', label: '다음 곡', isDefault: true },
    { id: nanoid(), emoji: '🔊', label: '볼륨 업', isDefault: true },
    { id: nanoid(), emoji: '🔉', label: '볼륨 다운', isDefault: true },
    { id: nanoid(), emoji: '👍', label: '좋음', isDefault: true },
  ];
  db.insert(commands).values(commandData).run();
  console.log(`Inserted ${commandData.length} commands.`);

  // 4. Profiles (3) - using role IDs from above
  const indojaRole = roleData.find((r) => r.name === '인도자')!;
  const geonbanRole = roleData.find((r) => r.name === '건반')!;
  const drumRole = roleData.find((r) => r.name === '드럼')!;

  const profileData = [
    { id: nanoid(), name: '김성준', roleId: indojaRole.id, color: 'bg-blue-500' },
    { id: nanoid(), name: '이미영', roleId: geonbanRole.id, color: 'bg-purple-500' },
    { id: nanoid(), name: '박준혁', roleId: drumRole.id, color: 'bg-green-500' },
  ];
  db.insert(profiles).values(profileData).run();
  console.log(`Inserted ${profileData.length} profiles.`);

  // 5. Worships (3) - using worship type IDs from above
  const juil1buType = worshipTypeData.find((t) => t.name === '주일 1부 예배')!;
  const juil2buType = worshipTypeData.find((t) => t.name === '주일 2부 예배')!;
  const suyoType = worshipTypeData.find((t) => t.name === '수요예배')!;

  const now = new Date().toISOString();
  const worshipData = [
    {
      id: nanoid(),
      title: '2024년 1월 첫째주 주일예배',
      date: '2024-01-07',
      typeId: juil1buType.id,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(),
      title: '2024년 1월 둘째주 주일예배',
      date: '2024-01-14',
      typeId: juil2buType.id,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(),
      title: '2024년 1월 수요예배',
      date: '2024-01-10',
      typeId: suyoType.id,
      createdAt: now,
      updatedAt: now,
    },
  ];
  db.insert(worships).values(worshipData).run();
  console.log(`Inserted ${worshipData.length} worships.`);

  // Summary
  console.log('\n--- Seed Summary ---');
  console.log(`Worship Types: ${worshipTypeData.length}`);
  console.log(`Roles:         ${roleData.length}`);
  console.log(`Commands:      ${commandData.length}`);
  console.log(`Profiles:      ${profileData.length}`);
  console.log(`Worships:      ${worshipData.length}`);
  console.log('-------------------');
  console.log('Seeding completed!');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
