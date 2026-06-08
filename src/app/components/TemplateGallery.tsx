import { useState } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';

interface Props {
  onSelectTemplate: (templateId: string) => void;
  onBack: () => void;
}

export function TemplateGallery({ onSelectTemplate, onBack }: Props) {
  const [activeTab, setActiveTab] = useState('ATS');

  const tabs = ['All Templates', 'Simple', 'Modern', 'One column', 'With photo', 'Professional', 'ATS'];

  const templates = [
    { id: 'classic', name: 'Harvard Classic', isATS: true },
    { id: 'modern', name: 'Modern Clean', isATS: true },
    { id: 'minimal', name: 'Executive Minimal', isATS: true },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} /> Back
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-10 max-w-3xl">
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Template Gallery
          </div>
          <h1 className="mb-3">
            Beat the <span className="text-primary">Algorithm</span>.
          </h1>
          <p className="text-muted-foreground">
            Enhance your job search with our ATS-optimized layouts.
          </p>
        </div>

        <div className="flex flex-wrap gap-6 border-b border-border mb-10 pb-0">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 font-mono text-xs uppercase tracking-widest transition-colors ${
                activeTab === tab 
                  ? 'text-primary border-b-2 border-primary -mb-[1px]' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="group relative bg-card border border-border p-8 flex flex-col items-start justify-between hover:border-primary transition-colors h-[400px]">
            <div>
              <div className="w-12 h-12 bg-primary/10 text-primary flex items-center justify-center mb-6">
                <Sparkles size={20} />
              </div>
              <h3 className="text-2xl mb-2">Let AI choose</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Increase chances of getting noticed by <span className="text-primary font-bold">30% with AI-powered choice</span>
              </p>
            </div>
            <div className="font-mono text-xs uppercase tracking-widest text-primary group-hover:underline">
              Auto-generate →
            </div>
            <button 
              onClick={() => onSelectTemplate('classic')}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label="Let AI Choose"
            />
          </div>

          {templates.map((tpl) => (
            <div key={tpl.id} className="group relative bg-card border border-border p-4 h-[400px] flex flex-col transition-colors hover:border-primary">
              {tpl.isATS && (
                <div className="absolute top-6 right-6 bg-primary text-primary-foreground text-[10px] uppercase tracking-widest font-bold px-2 py-1 z-10">
                  ATS
                </div>
              )}
              
              <div className="bg-[#f5f3ee] flex-1 border border-border p-6 overflow-hidden relative">
                 <div className="flex flex-col items-center border-b border-gray-300 pb-2 mb-2">
                   <div className="h-2 w-24 bg-gray-900 mb-1"></div>
                   <div className="h-1 w-16 bg-gray-500"></div>
                 </div>
                 <div className="space-y-3 mt-4 opacity-50">
                   <div>
                     <div className="h-1.5 w-12 bg-gray-900 mb-1.5 mx-auto"></div>
                     <div className="h-1 w-full bg-gray-400 mb-1"></div>
                     <div className="h-1 w-full bg-gray-400 mb-1"></div>
                     <div className="h-1 w-4/5 bg-gray-400"></div>
                   </div>
                   <div>
                     <div className="h-1.5 w-16 bg-gray-900 mb-1.5 mx-auto mt-4"></div>
                     <div className="h-1 w-24 bg-gray-600 mb-1"></div>
                     <div className="h-1 w-full bg-gray-400 mb-1 ml-2"></div>
                     <div className="h-1 w-11/12 bg-gray-400 mb-1 ml-2"></div>
                   </div>
                 </div>

                 <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                    <button 
                      onClick={() => onSelectTemplate(tpl.id)}
                      className="bg-primary text-primary-foreground font-mono text-xs uppercase tracking-widest py-3 px-6 hover:opacity-90 transition-opacity"
                    >
                      Use Template
                    </button>
                 </div>
              </div>

              <div className="flex justify-between items-center mt-4 px-2">
                <span className="font-mono text-xs uppercase tracking-widest text-foreground">{tpl.name}</span>
                <div className="flex gap-2">
                  <span className="border border-border text-muted-foreground text-[9px] uppercase tracking-widest px-1.5 py-0.5">PDF</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}