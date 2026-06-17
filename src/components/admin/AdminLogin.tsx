import { useState, type FormEvent } from 'react';
import type { AdminLoginStatus } from '../../types/admin';

interface AdminLoginProps {
  onLoginSuccess: () => void;
  onBackHome: () => void;
}

// 긴급 패치: 평문 비밀번호는 클라이언트 코드에 보관하지 않고 SHA-256 해시만 비교합니다.
// 프론트 단독 검증은 완전한 보안이 아니므로 이후 Firebase Auth 또는 서버 검증으로 교체해야 합니다.
const adminPasswordHash = 'fbf99112d320a8290abbeaa0975479ae10ee252ceac1953717b87e06e944a50c';

async function createSha256Hash(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;

  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}

export function AdminLogin({ onLoginSuccess, onBackHome }: AdminLoginProps) {
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<AdminLoginStatus>('idle');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const inputHash = await createSha256Hash(password);

    if (timingSafeEqual(inputHash, adminPasswordHash)) {
      setPassword('');
      setStatus('idle');
      onLoginSuccess();
      return;
    }

    setStatus('error');
  };

  return (
    <main className="min-h-screen px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md items-center">
        <section className="pixel-card-strong w-full overflow-hidden">
          <div className="border-b border-slate-200 bg-white px-5 py-5">
            <p className="text-xs font-black uppercase tracking-wide text-sky-700">Admin</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">관리자 페이지</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              스테이지 설정 화면으로 들어가기 위해 비밀번호를 입력하세요.
            </p>
          </div>

          <form className="grid gap-4 p-5" onSubmit={handleSubmit}>
            <label className="grid gap-2">
              <span className="text-sm font-black text-slate-700">비밀번호</span>
              <input
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setStatus('idle');
                }}
                className="rounded-lg border-2 border-slate-200 bg-white px-4 py-3 font-mono text-lg font-black text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                autoComplete="current-password"
              />
            </label>

            {status === 'error' ? (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">
                비밀번호가 올바르지 않습니다.
              </p>
            ) : null}

            <div className="grid gap-2 sm:grid-cols-2">
              <button type="submit" className="pixel-button">
                입장
              </button>
              <button type="button" onClick={onBackHome} className="pixel-button">
                홈으로 돌아가기
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
