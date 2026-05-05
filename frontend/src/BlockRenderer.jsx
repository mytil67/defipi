import React from 'react';

// Mappe align/size sur des classes CSS
const ALIGN = { left: 'bl-left', center: 'bl-center', right: 'bl-right' };
const SIZE  = { small: 'bl-small', medium: 'bl-medium', large: 'bl-large', full: 'bl-full' };

function Block({ block, stepData = {} }) {
  const cls = `bl ${ALIGN[block.align] || 'bl-center'} ${SIZE[block.size] || 'bl-full'}`;

  switch (block.type) {

    case 'text':
      return (
        <div className={cls}>
          <p className="bl-text" style={{ whiteSpace: 'pre-wrap' }}>{block.content}</p>
        </div>
      );

    case 'image':
      if (!block.options?.url) return null;
      return (
        <div className={cls}>
          <img src={block.options.url} alt={block.content || ''} className="bl-image" />
        </div>
      );

    case 'question':
      return (
        <div className={cls}>
          <p className="step-content">{block.content || stepData.questionText || ''}</p>
        </div>
      );

    case 'choices': {
      const opts = stepData.options || [];
      if (!opts.length) return null;
      return (
        <div className={cls}>
          <div className="quiz-grid">
            {opts.map((opt, i) => (
              <button key={i} className="btn-quiz" onClick={() => stepData.onAnswer?.(opt)}>
                <span className="quiz-letter">{String.fromCharCode(65 + i)}.</span>
                {opt}
              </button>
            ))}
          </div>
        </div>
      );
    }

    case 'button':
      return (
        <div className={cls}>
          <button className="btn btn-primary btn-xl" onClick={() => stepData.onAction?.()}>
            {block.content || 'Continuer'}
          </button>
        </div>
      );

    case 'fragment':
      return (
        <div className={cls}>
          <div className="fragments-hint">
            {(stepData.fragments || []).map((f, i) => (
              <span key={i} className="fragment-chip-large">{f}</span>
            ))}
          </div>
        </div>
      );

    default:
      return null;
  }
}

export function BlockRenderer({ blocks, stepData }) {
  if (!blocks?.length) return null;
  const sorted = [...blocks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return (
    <div className="block-layout">
      {sorted.map(block => <Block key={block.id} block={block} stepData={stepData} />)}
    </div>
  );
}
