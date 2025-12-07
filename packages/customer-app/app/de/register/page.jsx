import { Suspense } from 'react';
import Register from '../../../src/components/Register';
import Loading from '../../../src/components/Loading';

export default function GermanRegisterPage() {
  return (
    <div dir="ltr" lang="de">
      <Suspense fallback={<Loading />}>
        <Register />
      </Suspense>
    </div>
  );
}
