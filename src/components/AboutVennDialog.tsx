import { useMemo, useState } from 'react';
import { ABOUT_VENN_REFERENCES, ABOUT_VENN_SECTIONS } from './aboutVennContent.ts';

interface AboutVennDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutVennDialog({ isOpen, onClose }: AboutVennDialogProps) {
  const [activeSectionId, setActiveSectionId] = useState(ABOUT_VENN_SECTIONS[0]?.id ?? '');
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const activeSection = useMemo(
    () => ABOUT_VENN_SECTIONS.find(section => section.id === activeSectionId) ?? ABOUT_VENN_SECTIONS[0],
    [activeSectionId],
  );

  const activeImage = activeSection.images[activeImageIndex] ?? activeSection.images[0];
  const referenceMap = useMemo(
    () => new Map(ABOUT_VENN_REFERENCES.map(reference => [reference.id, reference])),
    [],
  );

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="welcome-dialog about-venn-dialog" onClick={e => e.stopPropagation()}>
        <div className="about-venn-header">
          <div>
            <h1 className="welcome-title">About Venn Diagrams</h1>
            <p className="about-venn-subtitle">
              A short introduction to Venn diagrams.
            </p>
          </div>
          <button className="btn welcome-summary-btn" onClick={onClose}>Close</button>
        </div>

        <div className="about-venn-tabs" role="tablist" aria-label="About Venn Diagrams sections">
          {ABOUT_VENN_SECTIONS.map(section => (
            <button
              key={section.id}
              className={`about-venn-tab ${section.id === activeSection.id ? 'about-venn-tab-active' : ''}`}
              onClick={() => {
                setActiveSectionId(section.id);
                setActiveImageIndex(0);
              }}
              role="tab"
              aria-selected={section.id === activeSection.id}
            >
              {section.title}
            </button>
          ))}
        </div>

        <div className="about-venn-grid">
          <div className="about-venn-main">
            <p className="about-venn-intro">{activeSection.intro}</p>

            <div className="about-venn-prose">
              {activeSection.paragraphs.map(paragraph => (
                <p key={paragraph} className="about-venn-paragraph">{paragraph}</p>
              ))}
            </div>

            {activeSection.quote && (
              <blockquote className="about-venn-quote">
                <p>"{activeSection.quote.text}"</p>
                <footer>
                  {activeSection.quote.attribution}
                  {' - '}
                  {referenceMap.get(activeSection.quote.referenceId)?.title}
                </footer>
              </blockquote>
            )}

            <section className={`about-venn-card about-venn-takeaways about-venn-takeaways-${activeSection.id}`}>
              <h3 className="about-venn-card-title">Key Takeaways</h3>
              <div className="about-venn-keypoints">
                {activeSection.keyPoints.map(point => (
                  <div key={point} className="about-venn-keypoint">{point}</div>
                ))}
              </div>
            </section>
          </div>

          <aside className="about-venn-visuals">
            <div className="about-venn-image-frame">
              <img src={activeImage.src} alt={activeImage.alt} className="about-venn-image" />
            </div>
            <div className="about-venn-caption">
              {activeImage.caption}
              <span className="about-venn-caption-source">
                Sources: {activeImage.referenceIds.map(referenceId => referenceMap.get(referenceId)?.title ?? referenceId).join('; ')}
              </span>
            </div>
            {activeSection.images.length > 1 && (
              <div className="about-venn-thumbs">
                {activeSection.images.map((image, index) => (
                  <button
                    key={image.src}
                    className={`about-venn-thumb ${index === activeImageIndex ? 'about-venn-thumb-active' : ''}`}
                    onClick={() => setActiveImageIndex(index)}
                    title={image.caption}
                  >
                    <img src={image.src} alt="" aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
          </aside>
        </div>

        <div className="about-venn-references">
          <h2 className="credits-section-title">References</h2>
          <div className="about-venn-reference-list">
            {ABOUT_VENN_REFERENCES.map(reference => (
              <div key={reference.id} className="about-venn-reference">
                <div className="about-venn-reference-title">{reference.title}</div>
                <div className="about-venn-reference-details">{reference.details}</div>
                {reference.file && (
                  <a
                    className="about-venn-reference-file"
                    href={`./${reference.file}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open PDF: {reference.file}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
