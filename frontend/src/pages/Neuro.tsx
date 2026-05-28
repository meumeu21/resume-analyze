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
  downloadTextDocx,
} from '../api/ai';
import type { AiReport, ImprovementsData } from '../api/ai';

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
  const [resumeGenError, setResumeGenError] = useState<string | null>(null);
  const [recGenError, setRecGenError] = useState<string | null>(null);

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
        setResumeGenError(null);
        startPolling(latestResume.id, 'resume');
      } else if (latestResume?.status === 'error') {
        setResumeGenError(latestResume.errorMessage ?? 'Генерация резюме завершилась с ошибкой');
      }

      if (latestRec?.status === 'pending') {
        setIsGeneratingRec(true);
        setRecGenError(null);
        startPolling(latestRec.id, 'recommendations');
      } else if (latestRec?.status === 'error') {
        setRecGenError(latestRec.errorMessage ?? 'Генерация рекомендаций завершилась с ошибкой');
      }
    } catch {}
  }

  function startPolling(reportId: string, type: Tab) {
    const ref = type === 'resume' ? resumePollRef : recPollRef;
    if (ref.current) clearInterval(ref.current);

    const MAX_POLLS = 70;
    let pollCount = 0;

    ref.current = setInterval(async () => {
      if (!accessToken) return;

      pollCount += 1;
      if (pollCount > MAX_POLLS) {
        clearInterval(ref.current!);
        ref.current = null;
        if (type === 'resume') {
          setIsGeneratingResume(false);
          setResumeGenError('Генерация не завершилась. Попробуйте ещё раз.');
        } else {
          setIsGeneratingRec(false);
          setRecGenError('Генерация не завершилась. Попробуйте ещё раз.');
        }
        return;
      }

      try {
        const report = await getReport(accessToken, reportId);
        if (report.status !== 'pending') {
          clearInterval(ref.current!);
          ref.current = null;
          if (type === 'resume') {
            setResumeReport(report);
            setIsGeneratingResume(false);
            if (report.status === 'error') {
              setResumeGenError(report.errorMessage ?? 'Ошибка генерации резюме');
            }
          } else {
            setRecommendReport(report);
            setIsGeneratingRec(false);
            if (report.status === 'error') {
              setRecGenError(report.errorMessage ?? 'Ошибка генерации рекомендаций');
            }
          }
        }
      } catch {}
    }, 3000);
  }

  async function handleGenerateResume() {
    if (!accessToken || isGeneratingResume) return;
    setIsGeneratingResume(true);
    setResumeGenError(null);
    setDownloadError(null);
    try {
      const report = await generateReport(accessToken, 'resume');
      setResumeReport(report);
      startPolling(report.id, 'resume');
    } catch (e) {
      setResumeGenError(e instanceof Error ? e.message : 'Ошибка генерации резюме');
      setIsGeneratingResume(false);
    }
  }

  async function handleGenerateRecommendations() {
    if (!accessToken || isGeneratingRec) return;
    setIsGeneratingRec(true);
    setRecGenError(null);
    setDownloadError(null);
    try {
      const report = await generateReport(accessToken, 'improvements');
      setRecommendReport(report);
      startPolling(report.id, 'recommendations');
    } catch (e) {
      setRecGenError(e instanceof Error ? e.message : 'Ошибка генерации рекомендаций');
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

  async function handleDownloadText() {
    if (!accessToken || !resumeReport || resumeReport.status !== 'done') return;
    setDownloadError(null);
    try {
      await downloadTextDocx(accessToken, resumeReport.id);
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : 'Ошибка скачивания');
    }
  }

  const resumeText = isGeneratingResume
    ? 'Нейросеть составляет резюме...'
    : resumeGenError
    ? resumeGenError
    : (resumeReport?.summary ?? 'Здесь будет текст вашего резюме');

  const canDownload = !!resumeReport && resumeReport.status === 'done';
  const resumeReady = !!resumeReport;

  return (
    <>
      <Header />

      <div className="neuro-banner" />

      <div className="container neuro-container">
        <div className="neuro-top-btns">
          <button
            className={activeTab === 'resume' ? 'button text' : 'button-light text'}
            type="button"
            onClick={() => setActiveTab('resume')}
          >
            Резюме
          </button>
          <button
            className={activeTab === 'recommendations' ? 'button text' : 'button-light text'}
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
            <div className="neuro-rec-actions">
              <button
                className="button text"
                type="button"
                onClick={handleGenerateRecommendations}
                disabled={isGeneratingRec || !user}
              >
                {isGeneratingRec
                  ? 'Анализирую...'
                  : recommendReport
                  ? 'Обновить рекомендации'
                  : 'Получить рекомендации'}
              </button>
            </div>

            {isGeneratingRec && (
              <p className="text neuro-rec-loading">Нейросеть анализирует ваши данные...</p>
            )}

            {!isGeneratingRec && recGenError && (
              <p className="text neuro-error">{recGenError}</p>
            )}

            {!isGeneratingRec && recommendReport?.status === 'done' && (() => {
              const data = recommendReport.rawResponse as unknown as ImprovementsData | null;
              if (!data) return <TextField title="Рекомендации" text={recommendReport.summary ?? ''} />;
              return (
                <div className="neuro-rec-sections">
                  {data.recommendations?.length > 0 && (
                    <section className="neuro-rec-section">
                      <h3 className="neuro-rec-section-title text">Что стоит улучшить</h3>
                      <div className="neuro-rec-list">
                        {data.recommendations.map((rec, i) => (
                          <div key={i} className="neuro-rec-card">
                            <p className="neuro-rec-card-title text">{rec.title}</p>
                            <p className="neuro-rec-card-desc text">{rec.description}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {data.project_ideas?.length > 0 && (
                    <section className="neuro-rec-section">
                      <h3 className="neuro-rec-section-title text">Идеи для проектов</h3>
                      <div className="neuro-ideas-list">
                        {data.project_ideas.map((idea, i) => (
                          <div key={i} className="neuro-idea-card">
                            <p className="neuro-idea-title text">{idea.title}</p>
                            <p className="neuro-idea-desc text">{idea.description}</p>
                            {idea.stack?.length > 0 && (
                              <div className="neuro-idea-stack">
                                {idea.stack.map((tech) => (
                                  <span key={tech} className="neuro-idea-tag text">{tech}</span>
                                ))}
                              </div>
                            )}
                            {idea.benefit && (
                              <p className="neuro-idea-benefit text">
                                <span className="neuro-idea-benefit-label">Что это даст:</span>{' '}
                                {idea.benefit}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'resume' && (
          <div>
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
                <button
                  className="button-light text"
                  type="button"
                  onClick={handleDownloadText}
                  disabled={!canDownload}
                >
                  Скачать текст ИИ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </>
  );
}

export default Neuro;
