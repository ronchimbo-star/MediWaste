import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Camera, ChevronLeft, X, CheckCircle, Upload, Loader2, CalendarDays, Briefcase } from 'lucide-react';

const DRIVER_PIN = '1281';

type Screen = 'pin' | 'jobs' | 'upload' | 'success';

interface Job {
  id: string;
  job_number: string;
  service_type: string;
  scheduled_date: string;
  status: string;
}

interface SelectedFile {
  file: File;
  preview: string;
  caption: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function serviceLabel(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function DriverUploadPage() {
  const [screen, setScreen] = useState<Screen>('pin');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePinDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setPinError(false);
    if (next.length === 4) {
      setTimeout(() => checkPin(next), 120);
    }
  };

  const handlePinDelete = () => {
    setPin(p => p.slice(0, -1));
    setPinError(false);
  };

  const checkPin = async (entered: string) => {
    if (entered !== DRIVER_PIN) {
      setPinError(true);
      setPin('');
      return;
    }
    setJobsLoading(true);
    setScreen('jobs');
    try {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      const from = past.toISOString().split('T')[0];
      const future = new Date();
      future.setDate(future.getDate() + 7);
      const to = future.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('mw_service_jobs')
        .select('id, job_number, service_type, scheduled_date, status')
        .in('status', ['scheduled', 'in_progress', 'completed'])
        .gte('scheduled_date', from)
        .lte('scheduled_date', to)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setJobs((data || []) as Job[]);
    } catch {
      setJobs([]);
    } finally {
      setJobsLoading(false);
    }
  };

  const selectJob = (job: Job) => {
    setSelectedJob(job);
    setFiles([]);
    setScreen('upload');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const incoming = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
    incoming.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFiles(prev => [...prev, { file, preview: reader.result as string, caption: '' }]);
      };
      reader.readAsDataURL(file);
    });
    // reset so same file can be selected again
    e.target.value = '';
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const updateCaption = (idx: number, caption: string) => {
    setFiles(prev => prev.map((f, i) => i === idx ? { ...f, caption } : f));
  };

  const handleUpload = async () => {
    if (!selectedJob || files.length === 0) return;
    setUploading(true);
    setUploadedCount(0);
    try {
      for (let i = 0; i < files.length; i++) {
        const { file, caption } = files[i];
        const ext = file.name.split('.').pop() || 'jpg';
        const fileName = `${selectedJob.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const filePath = `job-photos/${fileName}`;

        const { error: storageErr } = await supabase.storage
          .from('media')
          .upload(filePath, file);
        if (storageErr) throw storageErr;

        const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);

        const { error: dbErr } = await supabase.from('mw_job_photos').insert({
          job_id: selectedJob.id,
          photo_url: publicUrl,
          storage_path: filePath,
          photo_type: 'collection',
          caption: caption || null,
        });
        if (dbErr) throw dbErr;

        setUploadedCount(i + 1);
      }
      setScreen('success');
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setScreen('jobs');
    setFiles([]);
    setSelectedJob(null);
    setUploadedCount(0);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-gray-950 border-b border-gray-800 px-4 py-3 flex items-center gap-3 safe-area-top">
        {(screen === 'upload' || screen === 'jobs') && (
          <button
            onClick={() => {
              if (screen === 'upload') setScreen('jobs');
              else { setScreen('pin'); setPin(''); }
            }}
            className="text-gray-400 hover:text-white p-1 -ml-1"
          >
            <ChevronLeft size={22} />
          </button>
        )}
        <div className="flex items-center gap-2 flex-1">
          <img src="/mediwaste-logo.png" alt="MediWaste" className="h-6 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
        </div>
        {screen !== 'pin' && screen !== 'success' && (
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Driver Upload</span>
        )}
      </header>

      <div className="flex-1 flex flex-col">

        {/* ─── PIN SCREEN ─── */}
        {screen === 'pin' && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
            <div className="w-full max-w-xs">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-1">Driver Upload</h1>
                <p className="text-gray-400 text-sm">Enter your PIN to upload collection photos</p>
              </div>

              {/* PIN dots */}
              <div className="flex justify-center gap-4 mb-8">
                {[0, 1, 2, 3].map(i => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full transition-all duration-150 ${
                      pin.length > i
                        ? pinError ? 'bg-red-500' : 'bg-red-600'
                        : 'bg-gray-700'
                    }`}
                  />
                ))}
              </div>

              {pinError && (
                <p className="text-center text-red-400 text-sm mb-4">Incorrect PIN. Try again.</p>
              )}

              {/* Numeric keypad */}
              <div className="grid grid-cols-3 gap-3">
                {['1','2','3','4','5','6','7','8','9'].map(d => (
                  <button
                    key={d}
                    onClick={() => handlePinDigit(d)}
                    className="h-16 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-white text-2xl font-medium rounded-2xl transition-colors"
                  >
                    {d}
                  </button>
                ))}
                <div /> {/* empty cell */}
                <button
                  onClick={() => handlePinDigit('0')}
                  className="h-16 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-white text-2xl font-medium rounded-2xl transition-colors"
                >
                  0
                </button>
                <button
                  onClick={handlePinDelete}
                  className="h-16 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-gray-300 text-lg font-medium rounded-2xl transition-colors flex items-center justify-center"
                >
                  ⌫
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── JOB LIST SCREEN ─── */}
        {screen === 'jobs' && (
          <div className="flex-1 flex flex-col">
            <div className="px-4 pt-5 pb-3">
              <h2 className="text-lg font-bold text-white">Select Your Job</h2>
              <p className="text-gray-400 text-sm mt-0.5">Past 7 days and next 7 days</p>
            </div>

            {jobsLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="flex-1 flex items-center justify-center px-6 text-center">
                <div>
                  <Briefcase className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-400">No scheduled jobs found.</p>
                  <p className="text-gray-600 text-sm mt-1">Contact the office if your job is missing.</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
                {jobs.map(job => (
                  <button
                    key={job.id}
                    onClick={() => selectJob(job)}
                    className="w-full text-left bg-gray-900 border border-gray-800 hover:border-red-600 active:bg-gray-800 rounded-2xl p-4 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-base">{job.job_number}</p>
                        <p className="text-gray-400 text-sm mt-0.5 capitalize">{serviceLabel(job.service_type)}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                          <CalendarDays size={13} />
                          <span>{formatDate(job.scheduled_date)}</span>
                        </div>
                        <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                          job.status === 'in_progress'
                            ? 'bg-green-900 text-green-300'
                            : 'bg-blue-900 text-blue-300'
                        }`}>
                          {job.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── UPLOAD SCREEN ─── */}
        {screen === 'upload' && selectedJob && (
          <div className="flex-1 flex flex-col">
            <div className="px-4 pt-5 pb-3 border-b border-gray-800">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-0.5">Job</p>
              <h2 className="text-lg font-bold text-white">{selectedJob.job_number}</h2>
              <p className="text-gray-400 text-sm">{serviceLabel(selectedJob.service_type)} · {formatDate(selectedJob.scheduled_date)}</p>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
              {/* Add photos button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full border-2 border-dashed border-gray-700 hover:border-red-600 rounded-2xl p-6 flex flex-col items-center gap-2 transition-colors mb-4 disabled:opacity-50"
              >
                <Camera className="w-10 h-10 text-gray-500" />
                <p className="text-white font-medium">Add Photos</p>
                <p className="text-gray-500 text-xs">Tap to take a photo or choose from gallery</p>
              </button>

              {/* Selected photos */}
              {files.length > 0 && (
                <div className="space-y-3 mb-4">
                  <p className="text-gray-400 text-sm font-medium">{files.length} photo{files.length !== 1 ? 's' : ''} selected</p>
                  {files.map((f, idx) => (
                    <div key={idx} className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800">
                      <div className="relative">
                        <img
                          src={f.preview}
                          alt={`Photo ${idx + 1}`}
                          className="w-full h-48 object-cover"
                        />
                        <button
                          onClick={() => removeFile(idx)}
                          disabled={uploading}
                          className="absolute top-2 right-2 bg-black bg-opacity-60 text-white rounded-full p-1.5"
                        >
                          <X size={16} />
                        </button>
                        {uploading && uploadedCount > idx && (
                          <div className="absolute inset-0 bg-green-600 bg-opacity-40 flex items-center justify-center">
                            <CheckCircle className="w-10 h-10 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="px-3 py-2">
                        <input
                          type="text"
                          value={f.caption}
                          onChange={e => updateCaption(idx, e.target.value)}
                          placeholder="Add a note (optional)..."
                          disabled={uploading}
                          className="w-full bg-transparent text-gray-300 placeholder-gray-600 text-sm outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upload button — sticky at bottom */}
            {files.length > 0 && (
              <div className="px-4 pb-6 pt-3 border-t border-gray-800 bg-gray-950">
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Uploading {uploadedCount} of {files.length}…
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Upload {files.length} Photo{files.length !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── SUCCESS SCREEN ─── */}
        {screen === 'success' && selectedJob && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12 text-center">
            <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Photos Uploaded</h2>
            <p className="text-gray-400 mb-1">
              {uploadedCount} photo{uploadedCount !== 1 ? 's' : ''} saved for
            </p>
            <p className="text-white font-semibold mb-8">{selectedJob.job_number}</p>

            <div className="w-full max-w-xs space-y-3">
              <button
                onClick={reset}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-4 rounded-2xl transition-colors"
              >
                Upload More Photos
              </button>
              <button
                onClick={() => { setScreen('pin'); setPin(''); setSelectedJob(null); setFiles([]); }}
                className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-4 rounded-2xl transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
