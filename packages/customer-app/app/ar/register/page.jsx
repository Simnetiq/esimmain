import { Suspense } from 'react';
import Register from '../../../src/components/Register';
import Loading from '../../../src/components/Loading';

export default function ArabicRegisterPage() {
  return (
    <div dir="rtl" lang="ar">
      <Suspense fallback={<Loading />}>
        <Register />
      </Suspense>
    </div>
  );
}
