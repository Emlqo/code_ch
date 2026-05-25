import { useState, type FormEvent } from 'react';
import type { AdminLoginStatus } from '../../types/admin';

interface AdminLoginProps {
  onLoginSuccess: () => void;
  onBackHome: () => void;
}

// 임시 관리자 비밀번호입니다. 보안 목적이 아니라 관리자 페이지 구조 확인용 하드코딩입니다.
const temporaryAdminPassword = '0327';

export function AdminLogin({ onLoginSuccess, onBackHome }: AdminLoginProps) {
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<AdminLoginStatus>('idle');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password === temporaryAdminPassword) {
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
