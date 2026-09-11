import { MongoClient, Db } from 'mongodb';

// Next.js dev รี-โหลดโมดูลทุกครั้งที่แก้ไฟล์ ถ้าไม่ cache client ไว้บน globalThis
// จะเปิด connection pool ใหม่เรื่อย ๆ จนชน connection limit ของ Atlas
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const uri = process.env.MONGO_URI;

if (!uri) {
  throw new Error('ไม่พบ MONGO_URI ใน environment');
}

const clientPromise: Promise<MongoClient> =
  global._mongoClientPromise ?? new MongoClient(uri).connect();

if (process.env.NODE_ENV !== 'production') {
  global._mongoClientPromise = clientPromise;
}

/** database หลักของระบบ Safety Self Learning */
export const DB_NAME = 'safety';
export const COLLECTION_ADMIN = 'safety_lesson_admin';
export const COLLECTION_USER = 'safety_lesson_user';

export const getDb = async (): Promise<Db> => {
  const client = await clientPromise;
  return client.db(DB_NAME);
};

export default clientPromise;
