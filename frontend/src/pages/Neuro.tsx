import { useState, useEffect, useRef } from 'react';
import Footer from '../components/Footer';
import Header from '../components/Header';
import TextField from '../components/TextField';
import { useAuth } from '../context/AuthContext';
import {
  generateReport,
  getMyReports,
  getReport,
  downloadResumeDocx,
} from '../api/ai';
import type { AiReport } from '../api/ai';

import '../css/Neuro.css';
import '../css/main.css';

type Tab = 'resume' | 'recommendations';

function Neuro() {
  const { accessToken, user } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('resume');
  const [resumeReport, setResumeReport] = useState<AiReport | null>(null);
  const [recommendReport, setRecommendReport] = useState<AiReport | null>(null);
  const [isGeneratingResume, setIsGeneratingResume] = useState(false);
  const [isGeneratingRec, setIsGeneratingRec] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const resumePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    loadLatestReports();
  }, [accessToken]);

  useEffect(() => {
    return () => {
      if (resumePollRef.current) clearInterval(resumePollRef.current);
      if (recPollRef.current) clearInterval(recPollRef.current);
    };
  }, []);

  async function loadLatestReports() {
    if (!accessToken) return;
    try {
      const result = await getMyReports(accessToken);
      const reports = result.data;

      const latestResume = reports.find((r) => r.reportType === 'resume') ?? null;
      const latestRec = reports.find((r) => r.reportType === 'improvements') ?? null;

      setResumeReport(latestResume);
      setRecommendReport(latestRec);

      if (latestResume?.status === 'pending') {
        setIsGeneratingResume(true);
        startPolling(latestResume.id, 'resume');
      }
      if (latestRec?.status === 'pending') {
        setIsGeneratingRec(true);
        startPolling(latestRec.id, 'recommendations');
      }
    } catch {
      // ignore
    }
  }

  function startPolling(reportId: string, type: Tab) {
    const ref = type === 'resume' ? resumePollRef : recPollRef;
    if (ref.current) clearInterval(ref.current);

    ref.current = setInterval(async () => {
      if (!accessToken) return;
      try {
        const report = await getReport(accessToken, reportId);
        if (report.status !== 'pending') {
          clearInterval(ref.current!);
          ref.current = null;
          if (type === 'resume') {
            setResumeReport(report);
            setIsGeneratingResume(false);
          } else {
            setRecommendReport(report);
            setIsGeneratingRec(false);
          }
        }
      } catch {
        // retry on next tick
      }
    }, 3000);
  }

  async function handleGenerateResume() {
    if (!accessToken || isGeneratingResume) return;
    setIsGeneratingResume(true);
    setDownloadError(null);
    try {
      const report = await generateReport(accessToken, 'resume');
      setResumeReport(report);
      startPolling(report.id, 'resume');
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : 'Ошибка генерации');
      setIsGeneratingResume(false);
    }
  }

  async function handleGenerateRecommendations() {
    if (!accessToken || isGeneratingRec) return;
    setIsGeneratingRec(true);
    setDownloadError(null);
    try {
      const report = await generateReport(accessToken, 'improvements');
      setRecommendReport(report);
      startPolling(report.id, 'recommendations');
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : 'Ошибка генерации');
      setIsGeneratingRec(false);
    }
  }

  async function handleDownload() {
    if (!accessToken || !resumeReport || resumeReport.status !== 'done') return;
    setDownloadError(null);
    try {
      await downloadResumeDocx(accessToken, resumeReport.id);
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : 'Ошибка скачивания');
    }
  }

  const resumeText = isGeneratingResume
    ? 'Нейросеть составляет резюме...'
    : (resumeReport?.status === 'error'
      ? `Ошибка: ${resumeReport.errorMessage}`
      : (resumeReport?.summary ?? ''));

  const recText = isGeneratingRec
    ? 'Нейросеть анализирует ваши данные...'
    : (recommendReport?.status === 'error'
      ? `Ошибка: ${recommendReport.errorMessage}`
      : (recommendReport?.summary ?? ''));

  const canDownload = !!resumeReport && resumeReport.status === 'done';
  const resumeReady = !!resumeReport;

  return (
    <div>
      <Header />

      <div className="neuro-banner" />

      <div className="container">
        <div className="neuro-top-btns">
          <button
            className={`button text${activeTab === 'resume' ? ' neuro-tab--active' : ''}`}
            type="button"
            onClick={() => setActiveTab('resume')}
          >
            Резюме
          </button>
          <button
            className={`button text${activeTab === 'recommendations' ? ' neuro-tab--active' : ''}`}
            type="button"
            onClick={() => setActiveTab('recommendations')}
          >
            Рекомендации
          </button>
        </div>

        {!user && (
          <p className="neuro-auth-note text">Войдите в аккаунт, чтобы использовать нейросеть.</p>
        )}

        {activeTab === 'recommendations' && (
          <div>
            <h2>Рекомендации от нейросети</h2>
            {downloadError && <p className="neuro-error text">{downloadError}</p>}
            <button
              className="button text"
              type="button"
              onClick={handleGenerateRecommendations}
              disabled={isGeneratingRec || !user}
            >
              {isGeneratingRec ? 'Генерирую...' : 'Получить рекомендации'}
            </button>
            <TextField title="Ответ CommIt.Neuro" text={recText} />
          </div>
        )}

        {activeTab === 'resume' && (
          <div>
            <h2>Резюме</h2>
            {downloadError && <p className="neuro-error text">{downloadError}</p>}
            <div className="neuro-resume">
              <div className="neuro-resume__left">
                <TextField title="Резюме" text={resumeText} />
                <button
                  className="button text"
                  type="button"
                  onClick={handleGenerateResume}
                  disabled={isGeneratingResume || !user}
                >
                  {isGeneratingResume ? 'Генерирую...' : resumeReady ? 'Переделай!' : 'Создать резюме'}
                </button>
              </div>
              <div className="neuro-resume__right">
                <button
                  className="button text"
                  type="button"
                  onClick={handleDownload}
                  disabled={!canDownload}
                >
                  Скачать резюме
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

export default Neuro;
