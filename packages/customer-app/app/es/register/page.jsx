import { Suspense } from 'react';
import Register from '../../../src/components/Register';
import Loading from '../../../src/components/Loading';

export default function SpanishRegisterPage() {
  return (
    <div dir="ltr" lang="es">
      <Suspense fallback={<Loading />}>
        <Register />
      </Suspense>
    </div>
  );
}
