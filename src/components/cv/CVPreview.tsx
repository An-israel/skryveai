import React from "react";

export interface CVData {
  personal_info: {
    fullName?: string;
    title?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    website?: string;
    photoUrl?: string;
  };
  summary?: string;
  experiences: Array<{
    jobTitle: string;
    company: string;
    location?: string;
    startDate: string;
    endDate: string;
    isPresent?: boolean;
    bullets: string[];
  }>;
  education: Array<{
    degree: string;
    school: string;
    year?: string;
    grade?: string;
  }>;
  skills: string[];
  certifications: Array<{
    name: string;
    issuer?: string;
    year?: string;
  }>;
  projects: Array<{
    name: string;
    description?: string;
    url?: string;
  }>;
}

interface CVPreviewProps {
  data: CVData;
  template: string;
}

const SectionHeading = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <h2 className={`text-xs font-bold uppercase tracking-widest border-b pb-1 mb-3 ${className}`}>
    {children}
  </h2>
);

function ClassicTemplate({ data }: { data: CVData }) {
  const { personal_info, summary, experiences, education, skills, certifications, projects } = data;
  return (
    <div className="bg-white font-serif text-gray-900 p-8 min-h-[1100px] text-sm">
      {/* Header */}
      <div className="border-l-4 border-[#1E3A5F] pl-4 mb-6">
        <h1 className="text-3xl font-bold">{personal_info.fullName || "Your Name"}</h1>
        <p className="text-lg text-[#2563EB]">{personal_info.title || "Professional Title"}</p>
        <div className="flex gap-4 text-xs text-gray-600 mt-1 flex-wrap">
          {personal_info.email && <span>{personal_info.email}</span>}
          {personal_info.phone && <span>{personal_info.phone}</span>}
          {personal_info.location && <span>{personal_info.location}</span>}
          {personal_info.linkedin && <span>{personal_info.linkedin}</span>}
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <section className="mb-5">
          <SectionHeading className="text-[#1E3A5F]">Summary</SectionHeading>
          <p className="text-sm leading-relaxed">{summary}</p>
        </section>
      )}

      {/* Experience */}
      {experiences.length > 0 && (
        <section className="mb-5">
          <SectionHeading className="text-[#1E3A5F]">Experience</SectionHeading>
          {experiences.map((exp, i) => (
            <div key={i} className="mb-4">
              <div className="flex justify-between items-baseline">
                <h3 className="font-bold">{exp.jobTitle}</h3>
                <span className="text-xs text-gray-500">
                  {exp.startDate}{exp.startDate && (exp.endDate || exp.isPresent) ? " – " : ""}
                  {exp.isPresent ? "Present" : exp.endDate}
                </span>
              </div>
              <p className="text-xs text-gray-600 italic mb-1">
                {exp.company}{exp.location ? `, ${exp.location}` : ""}
              </p>
              {exp.bullets.filter(Boolean).length > 0 && (
                <ul className="list-disc list-inside space-y-0.5">
                  {exp.bullets.filter(Boolean).map((b, j) => (
                    <li key={j} className="text-xs text-gray-800">{b}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Education */}
      {education.length > 0 && (
        <section className="mb-5">
          <SectionHeading className="text-[#1E3A5F]">Education</SectionHeading>
          {education.map((edu, i) => (
            <div key={i} className="mb-2">
              <div className="flex justify-between">
                <span className="font-semibold">{edu.degree}</span>
                {edu.year && <span className="text-xs text-gray-500">{edu.year}</span>}
              </div>
              <p className="text-xs text-gray-600">{edu.school}{edu.grade ? ` — ${edu.grade}` : ""}</p>
            </div>
          ))}
        </section>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <section className="mb-5">
          <SectionHeading className="text-[#1E3A5F]">Skills</SectionHeading>
          <div className="flex flex-wrap gap-1">
            {skills.map((s, i) => (
              <span key={i} className="text-xs bg-gray-100 px-2 py-0.5 rounded">{s}</span>
            ))}
          </div>
        </section>
      )}

      {/* Certifications */}
      {certifications.length > 0 && (
        <section className="mb-5">
          <SectionHeading className="text-[#1E3A5F]">Certifications</SectionHeading>
          {certifications.map((cert, i) => (
            <div key={i} className="mb-1">
              <span className="font-semibold text-xs">{cert.name}</span>
              {cert.issuer && <span className="text-xs text-gray-500"> — {cert.issuer}</span>}
              {cert.year && <span className="text-xs text-gray-500"> ({cert.year})</span>}
            </div>
          ))}
        </section>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <section className="mb-5">
          <SectionHeading className="text-[#1E3A5F]">Projects</SectionHeading>
          {projects.map((proj, i) => (
            <div key={i} className="mb-2">
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-xs">{proj.name}</span>
                {proj.url && <a href={proj.url} className="text-xs text-[#2563EB] underline">{proj.url}</a>}
              </div>
              {proj.description && <p className="text-xs text-gray-700">{proj.description}</p>}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function ModernTemplate({ data }: { data: CVData }) {
  const { personal_info, summary, experiences, education, skills, certifications, projects } = data;
  return (
    <div className="bg-white font-sans text-gray-900 min-h-[1100px] text-sm">
      {/* Header bar */}
      <div className="bg-[#2563EB] text-white p-8">
        <h1 className="text-3xl font-bold">{personal_info.fullName || "Your Name"}</h1>
        <p className="text-lg text-blue-100 mt-1">{personal_info.title || "Professional Title"}</p>
        <div className="flex gap-4 text-xs text-blue-100 mt-2 flex-wrap">
          {personal_info.email && <span>{personal_info.email}</span>}
          {personal_info.phone && <span>{personal_info.phone}</span>}
          {personal_info.location && <span>{personal_info.location}</span>}
          {personal_info.linkedin && <span>{personal_info.linkedin}</span>}
        </div>
      </div>
      <div className="p-8">
        {summary && (
          <section className="mb-5">
            <SectionHeading className="text-[#2563EB]">Summary</SectionHeading>
            <p className="leading-relaxed">{summary}</p>
          </section>
        )}
        {experiences.length > 0 && (
          <section className="mb-5">
            <SectionHeading className="text-[#2563EB]">Experience</SectionHeading>
            {experiences.map((exp, i) => (
              <div key={i} className="mb-4">
                <div className="flex justify-between items-baseline">
                  <h3 className="font-bold text-[#1E3A5F]">{exp.jobTitle}</h3>
                  <span className="text-xs text-gray-500">
                    {exp.startDate}{exp.startDate && (exp.endDate || exp.isPresent) ? " – " : ""}
                    {exp.isPresent ? "Present" : exp.endDate}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-1">{exp.company}{exp.location ? `, ${exp.location}` : ""}</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {exp.bullets.filter(Boolean).map((b, j) => (
                    <li key={j} className="text-xs">{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}
        {education.length > 0 && (
          <section className="mb-5">
            <SectionHeading className="text-[#2563EB]">Education</SectionHeading>
            {education.map((edu, i) => (
              <div key={i} className="mb-2 flex justify-between">
                <div>
                  <p className="font-semibold">{edu.degree}</p>
                  <p className="text-xs text-gray-600">{edu.school}{edu.grade ? ` — ${edu.grade}` : ""}</p>
                </div>
                {edu.year && <span className="text-xs text-gray-500">{edu.year}</span>}
              </div>
            ))}
          </section>
        )}
        {skills.length > 0 && (
          <section className="mb-5">
            <SectionHeading className="text-[#2563EB]">Skills</SectionHeading>
            <div className="flex flex-wrap gap-1">
              {skills.map((s, i) => (
                <span key={i} className="text-xs bg-blue-50 text-[#2563EB] border border-blue-200 px-2 py-0.5 rounded-full">{s}</span>
              ))}
            </div>
          </section>
        )}
        {certifications.length > 0 && (
          <section className="mb-5">
            <SectionHeading className="text-[#2563EB]">Certifications</SectionHeading>
            {certifications.map((cert, i) => (
              <div key={i} className="mb-1 text-xs">
                <span className="font-semibold">{cert.name}</span>
                {cert.issuer && <span className="text-gray-500"> — {cert.issuer}</span>}
                {cert.year && <span className="text-gray-500"> ({cert.year})</span>}
              </div>
            ))}
          </section>
        )}
        {projects.length > 0 && (
          <section className="mb-5">
            <SectionHeading className="text-[#2563EB]">Projects</SectionHeading>
            {projects.map((proj, i) => (
              <div key={i} className="mb-2">
                <p className="font-semibold text-xs">{proj.name}{proj.url ? <a href={proj.url} className="text-[#2563EB] ml-2 font-normal underline text-xs">{proj.url}</a> : null}</p>
                {proj.description && <p className="text-xs text-gray-700">{proj.description}</p>}
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

function CreativeTemplate({ data }: { data: CVData }) {
  const { personal_info, summary, experiences, education, skills, certifications, projects } = data;
  return (
    <div className="bg-white font-sans text-gray-900 min-h-[1100px] text-sm">
      {/* Gradient header */}
      <div className="bg-gradient-to-r from-purple-600 to-[#2563EB] text-white p-8">
        <div className="flex items-center gap-4">
          {personal_info.photoUrl && (
            <img src={personal_info.photoUrl} alt="Profile" className="w-16 h-16 rounded-full border-2 border-white object-cover" />
          )}
          <div>
            <h1 className="text-3xl font-bold">{personal_info.fullName || "Your Name"}</h1>
            <p className="text-purple-100 text-lg">{personal_info.title || "Professional Title"}</p>
            <div className="flex gap-3 text-xs text-purple-100 mt-1 flex-wrap">
              {personal_info.email && <span>{personal_info.email}</span>}
              {personal_info.phone && <span>{personal_info.phone}</span>}
              {personal_info.location && <span>{personal_info.location}</span>}
            </div>
          </div>
        </div>
      </div>
      {/* Two-column body */}
      <div className="grid grid-cols-3 gap-0 flex-1">
        {/* Sidebar */}
        <div className="bg-gray-50 p-6 col-span-1">
          {skills.length > 0 && (
            <section className="mb-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-purple-600 border-b border-purple-200 pb-1 mb-2">Skills</h2>
              <div className="flex flex-col gap-1">
                {skills.map((s, i) => (
                  <span key={i} className="text-xs bg-white border border-purple-100 px-2 py-0.5 rounded">{s}</span>
                ))}
              </div>
            </section>
          )}
          {certifications.length > 0 && (
            <section className="mb-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-purple-600 border-b border-purple-200 pb-1 mb-2">Certifications</h2>
              {certifications.map((cert, i) => (
                <div key={i} className="mb-1">
                  <p className="text-xs font-semibold">{cert.name}</p>
                  {cert.issuer && <p className="text-xs text-gray-500">{cert.issuer} {cert.year ? `(${cert.year})` : ""}</p>}
                </div>
              ))}
            </section>
          )}
          {education.length > 0 && (
            <section className="mb-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-purple-600 border-b border-purple-200 pb-1 mb-2">Education</h2>
              {education.map((edu, i) => (
                <div key={i} className="mb-2">
                  <p className="text-xs font-semibold">{edu.degree}</p>
                  <p className="text-xs text-gray-500">{edu.school}</p>
                  {edu.year && <p className="text-xs text-gray-400">{edu.year}</p>}
                </div>
              ))}
            </section>
          )}
        </div>
        {/* Main content */}
        <div className="p-6 col-span-2">
          {summary && (
            <section className="mb-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-purple-600 border-b border-purple-200 pb-1 mb-2">About Me</h2>
              <p className="leading-relaxed text-gray-700">{summary}</p>
            </section>
          )}
          {experiences.length > 0 && (
            <section className="mb-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-purple-600 border-b border-purple-200 pb-1 mb-2">Experience</h2>
              {experiences.map((exp, i) => (
                <div key={i} className="mb-4">
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-bold text-gray-800">{exp.jobTitle}</h3>
                    <span className="text-xs text-gray-500">
                      {exp.startDate}{exp.startDate && (exp.endDate || exp.isPresent) ? " – " : ""}
                      {exp.isPresent ? "Present" : exp.endDate}
                    </span>
                  </div>
                  <p className="text-xs text-purple-600 mb-1">{exp.company}{exp.location ? `, ${exp.location}` : ""}</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {exp.bullets.filter(Boolean).map((b, j) => <li key={j} className="text-xs">{b}</li>)}
                  </ul>
                </div>
              ))}
            </section>
          )}
          {projects.length > 0 && (
            <section className="mb-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-purple-600 border-b border-purple-200 pb-1 mb-2">Projects</h2>
              {projects.map((proj, i) => (
                <div key={i} className="mb-2">
                  <p className="font-semibold text-xs">{proj.name}</p>
                  {proj.description && <p className="text-xs text-gray-700">{proj.description}</p>}
                  {proj.url && <a href={proj.url} className="text-xs text-purple-600 underline">{proj.url}</a>}
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function MinimalTemplate({ data }: { data: CVData }) {
  const { personal_info, summary, experiences, education, skills, certifications, projects } = data;
  return (
    <div className="bg-white font-sans text-gray-800 p-10 min-h-[1100px] text-sm">
      <div className="mb-8">
        <h1 className="text-4xl font-light tracking-tight text-gray-900">{personal_info.fullName || "Your Name"}</h1>
        <p className="text-base text-gray-500 mt-1">{personal_info.title || "Professional Title"}</p>
        <div className="flex gap-4 text-xs text-gray-400 mt-2 flex-wrap">
          {personal_info.email && <span>{personal_info.email}</span>}
          {personal_info.phone && <span>{personal_info.phone}</span>}
          {personal_info.location && <span>{personal_info.location}</span>}
          {personal_info.linkedin && <span>{personal_info.linkedin}</span>}
        </div>
      </div>
      <div className="border-t border-gray-100 my-4" />
      {summary && (
        <section className="mb-6">
          <p className="text-gray-600 leading-relaxed">{summary}</p>
        </section>
      )}
      {experiences.length > 0 && (
        <section className="mb-6">
          <div className="border-t border-gray-100 my-4" />
          {experiences.map((exp, i) => (
            <div key={i} className="mb-5 grid grid-cols-4 gap-4">
              <div className="col-span-1 text-right text-xs text-gray-400 pt-0.5">
                <p>{exp.startDate}</p>
                <p>{exp.isPresent ? "Present" : exp.endDate}</p>
              </div>
              <div className="col-span-3">
                <h3 className="font-semibold">{exp.jobTitle}</h3>
                <p className="text-xs text-gray-500 mb-1">{exp.company}</p>
                <ul className="space-y-0.5">
                  {exp.bullets.filter(Boolean).map((b, j) => <li key={j} className="text-xs text-gray-600">— {b}</li>)}
                </ul>
              </div>
            </div>
          ))}
        </section>
      )}
      {education.length > 0 && (
        <section className="mb-6">
          <div className="border-t border-gray-100 my-4" />
          {education.map((edu, i) => (
            <div key={i} className="mb-2 grid grid-cols-4 gap-4">
              <div className="col-span-1 text-right text-xs text-gray-400">{edu.year}</div>
              <div className="col-span-3">
                <p className="font-semibold text-xs">{edu.degree}</p>
                <p className="text-xs text-gray-500">{edu.school}</p>
              </div>
            </div>
          ))}
        </section>
      )}
      {skills.length > 0 && (
        <section className="mb-6">
          <div className="border-t border-gray-100 my-4" />
          <p className="text-xs text-gray-600">{skills.join("  ·  ")}</p>
        </section>
      )}
      {projects.length > 0 && (
        <section className="mb-6">
          <div className="border-t border-gray-100 my-4" />
          {projects.map((proj, i) => (
            <div key={i} className="mb-2">
              <p className="font-semibold text-xs">{proj.name}{proj.url ? <a href={proj.url} className="text-gray-400 ml-2 font-normal text-xs">{proj.url}</a> : null}</p>
              {proj.description && <p className="text-xs text-gray-500">{proj.description}</p>}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function ProfessionalTemplate({ data }: { data: CVData }) {
  const { personal_info, summary, experiences, education, skills, certifications, projects } = data;
  return (
    <div className="bg-white font-serif text-gray-900 p-8 min-h-[1100px] text-sm">
      <div className="text-center mb-6 border-b-2 border-gray-800 pb-4">
        <h1 className="text-3xl font-bold uppercase tracking-wide">{personal_info.fullName || "Your Name"}</h1>
        <p className="text-sm text-gray-600 mt-1">{personal_info.title || "Professional Title"}</p>
        <div className="flex justify-center gap-4 text-xs text-gray-500 mt-2 flex-wrap">
          {personal_info.email && <span>{personal_info.email}</span>}
          {personal_info.phone && <span>{personal_info.phone}</span>}
          {personal_info.location && <span>{personal_info.location}</span>}
          {personal_info.linkedin && <span>{personal_info.linkedin}</span>}
        </div>
      </div>
      {summary && (
        <section className="mb-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-700 border-b border-gray-300 pb-1 mb-2">Professional Summary</h2>
          <p className="leading-relaxed text-gray-700">{summary}</p>
        </section>
      )}
      {experiences.length > 0 && (
        <section className="mb-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-700 border-b border-gray-300 pb-1 mb-2">Professional Experience</h2>
          {experiences.map((exp, i) => (
            <div key={i} className="mb-4">
              <div className="flex justify-between">
                <h3 className="font-bold">{exp.jobTitle} — <span className="font-normal italic">{exp.company}</span></h3>
                <span className="text-xs text-gray-500">
                  {exp.startDate}{exp.startDate && (exp.endDate || exp.isPresent) ? " – " : ""}
                  {exp.isPresent ? "Present" : exp.endDate}
                </span>
              </div>
              {exp.location && <p className="text-xs text-gray-500 mb-1">{exp.location}</p>}
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                {exp.bullets.filter(Boolean).map((b, j) => <li key={j} className="text-xs">{b}</li>)}
              </ul>
            </div>
          ))}
        </section>
      )}
      {education.length > 0 && (
        <section className="mb-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-700 border-b border-gray-300 pb-1 mb-2">Education</h2>
          {education.map((edu, i) => (
            <div key={i} className="mb-2 flex justify-between">
              <div>
                <p className="font-bold">{edu.degree}</p>
                <p className="text-xs text-gray-600">{edu.school}{edu.grade ? ` · ${edu.grade}` : ""}</p>
              </div>
              {edu.year && <span className="text-xs text-gray-500">{edu.year}</span>}
            </div>
          ))}
        </section>
      )}
      {skills.length > 0 && (
        <section className="mb-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-700 border-b border-gray-300 pb-1 mb-2">Core Competencies</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {skills.map((s, i) => <span key={i} className="text-xs">• {s}</span>)}
          </div>
        </section>
      )}
      {certifications.length > 0 && (
        <section className="mb-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-700 border-b border-gray-300 pb-1 mb-2">Certifications</h2>
          {certifications.map((cert, i) => (
            <p key={i} className="text-xs mb-0.5">• {cert.name}{cert.issuer ? ` — ${cert.issuer}` : ""}{cert.year ? ` (${cert.year})` : ""}</p>
          ))}
        </section>
      )}
      {projects.length > 0 && (
        <section className="mb-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-700 border-b border-gray-300 pb-1 mb-2">Projects</h2>
          {projects.map((proj, i) => (
            <div key={i} className="mb-2">
              <p className="font-bold text-xs">{proj.name}</p>
              {proj.description && <p className="text-xs text-gray-700">{proj.description}</p>}
              {proj.url && <p className="text-xs text-gray-500">{proj.url}</p>}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function BoldTemplate({ data }: { data: CVData }) {
  const { personal_info, summary, experiences, education, skills, certifications, projects } = data;
  return (
    <div className="bg-white font-sans text-gray-900 min-h-[1100px] text-sm">
      {/* Dark header */}
      <div className="bg-[#1E3A5F] text-white p-8">
        <h1 className="text-4xl font-extrabold tracking-tight">{personal_info.fullName || "Your Name"}</h1>
        <p className="text-xl text-[#2563EB] mt-1 font-medium">{personal_info.title || "Professional Title"}</p>
        <div className="flex gap-4 text-xs text-gray-300 mt-3 flex-wrap">
          {personal_info.email && <span>{personal_info.email}</span>}
          {personal_info.phone && <span>{personal_info.phone}</span>}
          {personal_info.location && <span>{personal_info.location}</span>}
          {personal_info.linkedin && <span>{personal_info.linkedin}</span>}
          {personal_info.github && <span>{personal_info.github}</span>}
        </div>
      </div>
      <div className="p-8">
        {summary && (
          <section className="mb-6 p-4 bg-gray-50 rounded-lg border-l-4 border-[#2563EB]">
            <p className="leading-relaxed text-gray-700">{summary}</p>
          </section>
        )}
        {experiences.length > 0 && (
          <section className="mb-6">
            <h2 className="text-base font-extrabold uppercase tracking-widest text-[#1E3A5F] border-b-2 border-[#2563EB] pb-2 mb-3">Experience</h2>
            {experiences.map((exp, i) => (
              <div key={i} className="mb-4">
                <div className="flex justify-between items-baseline">
                  <h3 className="font-bold text-base text-[#1E3A5F]">{exp.jobTitle}</h3>
                  <span className="text-xs font-medium text-[#2563EB]">
                    {exp.startDate}{exp.startDate && (exp.endDate || exp.isPresent) ? " – " : ""}
                    {exp.isPresent ? "Present" : exp.endDate}
                  </span>
                </div>
                <p className="text-xs font-semibold text-gray-500 mb-1">{exp.company}{exp.location ? ` · ${exp.location}` : ""}</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {exp.bullets.filter(Boolean).map((b, j) => <li key={j} className="text-xs">{b}</li>)}
                </ul>
              </div>
            ))}
          </section>
        )}
        <div className="grid grid-cols-2 gap-6">
          <div>
            {education.length > 0 && (
              <section className="mb-6">
                <h2 className="text-base font-extrabold uppercase tracking-widest text-[#1E3A5F] border-b-2 border-[#2563EB] pb-2 mb-3">Education</h2>
                {education.map((edu, i) => (
                  <div key={i} className="mb-2">
                    <p className="font-bold text-xs">{edu.degree}</p>
                    <p className="text-xs text-gray-600">{edu.school}</p>
                    {edu.year && <p className="text-xs text-gray-400">{edu.year}</p>}
                  </div>
                ))}
              </section>
            )}
            {certifications.length > 0 && (
              <section className="mb-6">
                <h2 className="text-base font-extrabold uppercase tracking-widest text-[#1E3A5F] border-b-2 border-[#2563EB] pb-2 mb-3">Certifications</h2>
                {certifications.map((cert, i) => (
                  <div key={i} className="mb-1">
                    <p className="text-xs font-semibold">{cert.name}</p>
                    {cert.issuer && <p className="text-xs text-gray-500">{cert.issuer} {cert.year ? `(${cert.year})` : ""}</p>}
                  </div>
                ))}
              </section>
            )}
          </div>
          <div>
            {skills.length > 0 && (
              <section className="mb-6">
                <h2 className="text-base font-extrabold uppercase tracking-widest text-[#1E3A5F] border-b-2 border-[#2563EB] pb-2 mb-3">Skills</h2>
                <div className="flex flex-wrap gap-1">
                  {skills.map((s, i) => (
                    <span key={i} className="text-xs bg-[#1E3A5F]/10 text-[#1E3A5F] px-2 py-0.5 rounded font-medium">{s}</span>
                  ))}
                </div>
              </section>
            )}
            {projects.length > 0 && (
              <section className="mb-6">
                <h2 className="text-base font-extrabold uppercase tracking-widest text-[#1E3A5F] border-b-2 border-[#2563EB] pb-2 mb-3">Projects</h2>
                {projects.map((proj, i) => (
                  <div key={i} className="mb-2">
                    <p className="font-bold text-xs">{proj.name}</p>
                    {proj.description && <p className="text-xs text-gray-600">{proj.description}</p>}
                  </div>
                ))}
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const CVPreview = React.forwardRef<HTMLDivElement, CVPreviewProps>(({ data, template }, ref) => {
  const templateMap: Record<string, React.ComponentType<{ data: CVData }>> = {
    classic: ClassicTemplate,
    modern: ModernTemplate,
    creative: CreativeTemplate,
    minimal: MinimalTemplate,
    professional: ProfessionalTemplate,
    bold: BoldTemplate,
  };

  const Template = templateMap[template] || ClassicTemplate;
  return (
    <div ref={ref}>
      <Template data={data} />
    </div>
  );
});

CVPreview.displayName = "CVPreview";

export default CVPreview;
