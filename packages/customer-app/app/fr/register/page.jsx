import { Suspense } from 'react';
import Register from '../../../src/components/Register';
import Loading from '../../../src/components/Loading';

export default function FrenchRegisterPage() {
  return (
    <div dir="ltr" lang="fr">
      <Suspense fallback={<Loading />}>
        <Register />
      </Suspense>
    </div>
  );
}
