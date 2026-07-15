import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  chatWithBook,
  checkBackendHealth,
  deleteStudyBook,
  fetchStudyAnalytics,
  generateBookExam,
  generateBookQuiz,
  listStudyBooks,
  runStudyTool,
  submitBookAssessment,
  uploadStudyBook,
} from '../../api';
import MarkdownMessage from '../../components/MarkdownMessage';
import StudyAnalyticsPanel from '../../components/study/StudyAnalyticsPanel';
import StudyAssessment from '../../components/study/StudyAssessment';
import {
  AssessmentResult,
  BookChapter,
  ChatMessage,
  QuizQuestion,
  StudyAnalytics,
  StudyBook,
  WorkspaceTab,
} from '../../types/study';

const TEXT = '#d0e4f0';
const DIM = 'rgba(180,220,240,0.75)';
const ACCENT = '#00e5ff';

const WORKSPACE_TABS: { id: WorkspaceTab; label: string }[] = [
  { id: 'library', label: 'My Library' },
  { id: 'chat', label: 'Chat with Book' },
  { id: 'quiz', label: 'Quiz from Book' },
  { id: 'exam', label: 'Exam Mode' },
  { id: 'tools', label: 'Study Tools' },
  { id: 'analytics', label: 'Analytics' },
];

const StudyCompanion: React.FC = () => {
  const [books, setBooks] = useState<StudyBook[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<WorkspaceTab>('library');
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chapterFilter, setChapterFilter] = useState('');

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [attemptId, setAttemptId] = useState('');
  const [assessmentMode, setAssessmentMode] = useState<'quiz' | 'exam'>('quiz');
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [examMinutes, setExamMinutes] = useState(45);

  const [toolOutput, setToolOutput] = useState('');
  const [toolLoading, setToolLoading] = useState(false);
  const [analytics, setAnalytics] = useState<StudyAnalytics | null>(null);

  const selectedBook = books.find(b => b.id === selectedId) ?? null;
  const selectedChapter = selectedBook?.chapters.find(ch => ch.id === chapterFilter) ?? null;

  const refreshBooks = useCallback(async () => {
    const online = await checkBackendHealth();
    setBackendOnline(online);
    if (!online) {
      setError('Backend is not reachable. Run npm start from the project root and wait for the backend terminal to finish loading.');
      return;
    }
    try {
      setError('');
      const data = await listStudyBooks();
      setBooks(data);
      setSelectedId(prev => prev ?? (data.length > 0 ? data[0].id : null));
    } catch (e: unknown) {
      const detail = axios.isAxiosError(e)
        ? String(e.response?.data?.detail ?? e.message)
        : 'Could not load study library.';
      setError(detail);
    }
  }, []);

  useEffect(() => {
    setUploading(false);
    refreshBooks();
  }, [refreshBooks]);

  useEffect(() => {
    const processing = books.some(b => b.status === 'processing');
    if (!processing) return;
    const timer = setInterval(async () => {
      try {
        const data = await listStudyBooks();
        setBooks(data);
      } catch {
        // keep polling silently while processing
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [books]);

  const handleUpload = async (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      setError('File is too large. Please upload a PDF under 50 MB.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const online = await checkBackendHealth();
      if (!online) {
        setError('Backend is offline. Start the server with npm start, then try again.');
        return;
      }
      const res = await uploadStudyBook(file);
      setSelectedId(res.book_id);
      setTab('library');
      await refreshBooks();
    } catch (e: unknown) {
      if (axios.isAxiosError(e) && (e.code === 'ECONNABORTED' || e.message.includes('timeout'))) {
        setError('Upload timed out. Ensure the backend is running on port 8000, then try again.');
      } else {
        setError(axios.isAxiosError(e) ? String(e.response?.data?.detail ?? e.message) : 'Upload failed');
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (bookId: string) => {
    if (deletingId) return;
    setDeletingId(bookId);
    setError('');
    try {
      await deleteStudyBook(bookId);
    } catch (e: unknown) {
      if (axios.isAxiosError(e) && e.response?.status === 404) {
        // Already removed — treat as success
      } else {
        setError(
          axios.isAxiosError(e)
            ? String(e.response?.data?.detail ?? e.message)
            : 'Could not remove book.',
        );
      }
    } finally {
      if (selectedId === bookId) {
        setSelectedId(null);
        setMessages([]);
        setQuestions([]);
        setResult(null);
      }
      setBooks(prev => prev.filter(b => b.id !== bookId));
      setDeletingId(null);
      refreshBooks();
    }
  };

  const sendChat = async () => {
    if (!selectedBook || !chatInput.trim() || chatLoading) return;
    const userMsg: ChatMessage = { role: 'user', content: chatInput.trim() };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);
    setError('');
    try {
      const res = await chatWithBook(selectedBook.id, userMsg.content, messages, chapterFilter || undefined);
      setMessages(prev => [...prev, { role: 'assistant', content: res.answer, citations: res.citations }]);
    } catch (e: unknown) {
      setError(axios.isAxiosError(e) ? String(e.response?.data?.detail ?? e.message) : 'Chat failed');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setChatLoading(false);
    }
  };

  const startAssessment = async (mode: 'quiz' | 'exam') => {
    if (!selectedBook) return;
    setAssessmentLoading(true);
    setResult(null);
    setError('');
    try {
      if (mode === 'quiz') {
        const res = await generateBookQuiz(selectedBook.id, {
          num_questions: 10,
          difficulty: 'mixed',
          question_types: ['mcq', 'true_false'],
          chapter_ids: chapterFilter ? [chapterFilter] : [],
          topics: selectedChapter ? [selectedChapter.title] : [],
        });
        setQuestions(res.questions);
        setAttemptId(res.attempt_id);
      } else {
        const res = await generateBookExam(selectedBook.id, {
          num_questions: 20,
          difficulty: 'mixed',
          chapter_ids: chapterFilter ? [chapterFilter] : [],
          time_limit_minutes: examMinutes,
        });
        setQuestions(res.questions);
        setAttemptId(res.attempt_id);
        setExamMinutes(res.time_limit_minutes);
      }
      setAssessmentMode(mode);
    } catch (e: unknown) {
      setError(axios.isAxiosError(e) ? String(e.response?.data?.detail ?? e.message) : 'Generation failed');
    } finally {
      setAssessmentLoading(false);
    }
  };

  const handleSubmitAssessment = async (answers: Record<string, string>, duration: number) => {
    if (!selectedBook || !attemptId) return;
    const res = await submitBookAssessment(selectedBook.id, {
      attempt_id: attemptId,
      answers,
      duration_seconds: duration,
    });
    setResult(res);
    setQuestions([]);
  };

  const loadAnalytics = useCallback(async () => {
    if (!selectedBook) return;
    const data = await fetchStudyAnalytics(selectedBook.id);
    setAnalytics(data);
  }, [selectedBook]);

  useEffect(() => {
    if (tab === 'analytics' && selectedBook) loadAnalytics();
  }, [tab, selectedBook, loadAnalytics]);

  const runTool = async (tool: string, topic: string) => {
    if (!selectedBook) return;
    setToolLoading(true);
    setToolOutput('');
    try {
      const res = await runStudyTool(selectedBook.id, tool, {
        topic,
        chapter_id: chapterFilter || null,
        num_items: 10,
      });
      setToolOutput(res.content);
    } catch (e: unknown) {
      setToolOutput(axios.isAxiosError(e) ? String(e.response?.data?.detail ?? e.message) : 'Tool failed');
    } finally {
      setToolLoading(false);
    }
  };

  const ready = selectedBook?.status === 'ready';

  return (
    <div className="study-companion">
      <div className="fade-in" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 14,
          background: 'rgba(180,120,255,0.08)', border: '1px solid rgba(180,120,255,0.25)',
          borderRadius: 100, padding: '8px 20px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#b47bff', boxShadow: '0 0 10px #b47bff' }} />
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#b47bff', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Study with Your Book · RAG
          </span>
        </div>
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', fontWeight: 900, color: TEXT, letterSpacing: -1.5 }}>
          Medical Study Companion
        </h2>
        <p style={{ color: DIM, fontSize: 16, maxWidth: 720, lineHeight: 1.7, marginTop: 8 }}>
          Upload textbooks and notes, then chat, quiz, and take exams grounded in your own material.
        </p>
      </div>

      <div className="study-workspace">
        <aside className="study-sidebar glass">
          <div className="mono-label" style={{ marginBottom: 12 }}>Study with Your Book</div>
          <input ref={fileRef} type="file" accept=".pdf,.txt,.md" hidden
            onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
          <button className="btn-cyan" style={{ width: '100%', justifyContent: 'center', marginBottom: 14 }}
            disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? 'Uploading…' : '+ Upload Book / PDF'}
          </button>
          <p style={{ fontSize: 11, color: 'rgba(140,180,210,0.55)', marginBottom: 16, lineHeight: 1.5 }}>
            PDF, TXT, MD · Indexed with vector embeddings
          </p>

          <div className="study-book-list">
            {books.length === 0 && (
              <p style={{ color: DIM, fontSize: 13, lineHeight: 1.6 }}>No books yet. Upload your first textbook to begin.</p>
            )}
            {books.map(book => (
              <button key={book.id} className={`study-book-item ${selectedId === book.id ? 'study-book-item--active' : ''}`}
                onClick={() => { setSelectedId(book.id); setMessages([]); setResult(null); setQuestions([]); }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong style={{ color: TEXT, fontSize: 14 }}>{book.title}</strong>
                  <span className={`tag-${book.status === 'ready' ? 'green' : book.status === 'failed' ? 'red' : 'amber'}`}>
                    {book.status}
                  </span>
                </div>
                {book.status === 'processing' && (
                  <div className="study-progress" style={{ marginTop: 8 }}>
                    <div className="study-progress__bar" style={{ width: `${Math.round(book.progress * 100)}%` }} />
                  </div>
                )}
                {book.status === 'ready' && (
                  <p style={{ fontSize: 11, color: DIM, marginTop: 6 }}>
                    {book.page_count} pages · {book.chunk_count} chunks · {book.chapters.length} sections
                  </p>
                )}
                {book.status === 'failed' && (
                  <p style={{ fontSize: 11, color: '#ff8a80', marginTop: 6 }}>{book.error_message}</p>
                )}
                <button type="button" className="study-book-delete" disabled={deletingId === book.id}
                  onClick={e => { e.stopPropagation(); e.preventDefault(); handleDelete(book.id); }}>
                  {deletingId === book.id ? 'Removing…' : 'Remove'}
                </button>
              </button>
            ))}
          </div>

          {ready && selectedBook && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(0,229,255,0.08)' }}>
              <div className="mono-label" style={{ marginBottom: 8 }}>Chapter filter</div>
              <select className="input-med" value={chapterFilter} onChange={e => setChapterFilter(e.target.value)}
                aria-label="Chapter filter">
                <option value="">All chapters</option>
                {selectedBook.chapters.map((ch: BookChapter) => (
                  <option key={ch.id} value={ch.id}>{ch.title}</option>
                ))}
              </select>
            </div>
          )}
        </aside>

        <main className="study-main glass">
          <div className="study-tabs">
            {WORKSPACE_TABS.map(t => (
              <button key={t.id} className={`study-tab ${tab === t.id ? 'study-tab--active' : ''}`}
                disabled={t.id !== 'library' && !ready}
                onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="study-error">
              {error}
              {backendOnline === false && (
                <div style={{ marginTop: 10, fontSize: 13, opacity: 0.9 }}>
                  Tip: open a terminal in the project folder and run <code style={{ color: '#00e5ff' }}>npm start</code>
                </div>
              )}
            </div>
          )}

          {!selectedBook && tab !== 'library' && (
            <div className="study-empty">Select or upload a book to open the study workspace.</div>
          )}

          {tab === 'library' && (
            <div className="study-panel fade-in">
              <h3 style={{ color: TEXT, fontSize: 20, fontWeight: 800, marginBottom: 12 }}>Your Study Library</h3>
              <p style={{ color: DIM, lineHeight: 1.7, marginBottom: 20 }}>
                Upload medical textbooks, lecture notes, PDFs, or study guides. The AI indexes every chapter
                so you can chat, generate quizzes, and take exams from your material.
              </p>
              {selectedBook?.status === 'processing' && (
                <div className="study-processing">
                  <div className="clinical-spinner" style={{ width: 24, height: 24 }} />
                  <p>Processing <strong>{selectedBook.title}</strong>… {Math.round(selectedBook.progress * 100)}%</p>
                </div>
              )}
              {ready && selectedBook && (
                <button className="btn-cyan" onClick={() => setTab('chat')}>Open Chat with Book →</button>
              )}
            </div>
          )}

          {tab === 'chat' && ready && selectedBook && (
            <div className="study-panel study-chat fade-in">
              <div className="study-chat__messages">
                {messages.length === 0 && (
                  <p style={{ color: DIM, fontSize: 14, lineHeight: 1.7 }}>
                    Ask anything about <strong>{selectedBook.title}</strong> — summaries, explanations, mnemonics, exam tips.
                  </p>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`study-chat__bubble study-chat__bubble--${m.role}`}>
                    <MarkdownMessage content={m.content} fontSize={14} />
                    {m.citations && m.citations.length > 0 && (
                      <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {m.citations.map((c: NonNullable<ChatMessage['citations']>[number], j: number) => (
                          <span key={j} className="tag-cyan">{c.chapter} · p.{c.page}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {chatLoading && <div className="study-chat__typing"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div>}
              </div>
              <div className="study-chat__input">
                <input className="input-med" value={chatInput} onChange={e => setChatInput(e.target.value)}
                  placeholder="Ask about a concept, chapter, or exam topic…"
                  onKeyDown={e => e.key === 'Enter' && sendChat()} aria-label="Chat message" />
                <button className="btn-cyan" onClick={sendChat} disabled={chatLoading || !chatInput.trim()}>Ask</button>
              </div>
            </div>
          )}

          {(tab === 'quiz' || tab === 'exam') && ready && selectedBook && !questions.length && !result && (
            <div className="study-panel fade-in">
              <h3 style={{ color: TEXT, fontSize: 18, fontWeight: 800, marginBottom: 10 }}>
                {tab === 'quiz' ? 'Generate Quiz from Book' : 'Generate Full Exam'}
              </h3>
              <p style={{ color: DIM, marginBottom: 16, lineHeight: 1.65 }}>
                {tab === 'quiz'
                  ? 'Creates MCQ and true/false questions with instant feedback and topic analysis.'
                  : 'Creates a balanced mock exam with detailed performance report.'}
              </p>
              {selectedChapter ? (
                <p style={{ color: ACCENT, fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
                  Questions will be drawn from: <strong>{selectedChapter.title}</strong>
                  {selectedChapter.start_page > 0 && (
                    <span style={{ color: DIM }}> · pp. {selectedChapter.start_page}–{selectedChapter.end_page}</span>
                  )}
                </p>
              ) : (
                <p style={{ color: 'rgba(255,215,64,0.85)', fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
                  Select a chapter in the sidebar to generate questions from that section only.
                </p>
              )}
              {tab === 'exam' && (
                <label style={{ display: 'block', marginBottom: 16, color: DIM, fontSize: 14 }}>
                  Time limit (minutes)
                  <input className="input-med" type="number" min={10} max={180} value={examMinutes}
                    onChange={e => setExamMinutes(Number(e.target.value))} style={{ marginTop: 6 }} />
                </label>
              )}
              <button className="btn-cyan" disabled={assessmentLoading || !chapterFilter}
                onClick={() => startAssessment(tab === 'quiz' ? 'quiz' : 'exam')}>
                {assessmentLoading ? 'Generating…' : tab === 'quiz' ? 'Generate Quiz' : 'Start Exam Mode'}
              </button>
            </div>
          )}

          {(tab === 'quiz' || tab === 'exam') && questions.length > 0 && (
            <StudyAssessment
              questions={questions}
              mode={assessmentMode}
              timeLimitMinutes={examMinutes}
              onSubmit={handleSubmitAssessment}
            />
          )}

          {(tab === 'quiz' || tab === 'exam') && result && (
            <div className="study-panel fade-in">
              <div className="study-score-card">
                <p style={{ fontSize: 48, fontWeight: 900, color: ACCENT, lineHeight: 1 }}>{result.percentage}%</p>
                <p style={{ color: DIM }}>{result.correct}/{result.total} correct · {result.readiness_level}</p>
              </div>
              <StudyAnalyticsPanel analytics={{
                total_attempts: 1,
                average_score: result.percentage,
                best_score: result.percentage,
                recent_trend: [{ date: new Date().toISOString().slice(0, 10), percentage: result.percentage, mode: assessmentMode }],
                topic_mastery: result.topic_breakdown.map((t: AssessmentResult['topic_breakdown'][number]) => ({ topic: t.topic, average: t.percentage, attempts: 1 })),
                recommendations: result.recommendations,
              }} breakdown={result.topic_breakdown} results={result.results} />
              <button className="btn-outline" style={{ marginTop: 16 }} onClick={() => { setResult(null); setQuestions([]); }}>
                Try Again
              </button>
            </div>
          )}

          {tab === 'tools' && ready && selectedBook && (
            <div className="study-panel fade-in">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                {[
                  ['summary', 'Chapter Summary'],
                  ['revision', 'Revision Notes'],
                  ['flashcards', 'Flashcards'],
                  ['compare', 'Compare Topics'],
                ].map(([tool, label]) => (
                  <button key={tool} className="btn-outline" disabled={toolLoading}
                    onClick={() => runTool(tool, selectedChapter?.title ?? selectedBook.title)}>
                    {label}
                  </button>
                ))}
              </div>
              {toolLoading && <div className="study-processing"><div className="clinical-spinner" /></div>}
              {toolOutput && <div className="study-tool-output"><MarkdownMessage content={toolOutput} fontSize={14} /></div>}
            </div>
          )}

          {tab === 'analytics' && selectedBook && analytics && (
            <StudyAnalyticsPanel analytics={analytics} />
          )}
        </main>
      </div>

      <p style={{ marginTop: 20, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'rgba(255,215,64,0.65)', lineHeight: 1.6 }}>
        Educational use only. AI-generated quizzes and chat responses may contain errors — always verify with your textbook and instructors.
      </p>
    </div>
  );
};

export default StudyCompanion;
