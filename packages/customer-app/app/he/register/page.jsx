import { Suspense } from 'react';
import Register from '../../../src/components/Register';
import Loading from '../../../src/components/Loading';

export default function HebrewRegisterPage() {
  return (
    <div dir="rtl" lang="he">
      <Suspense fallback={<Loading />}>
        <Register />
      </Suspense>
    </div>
  );
}
