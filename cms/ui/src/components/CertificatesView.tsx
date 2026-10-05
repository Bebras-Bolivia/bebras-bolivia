import React from 'react';
import CertificateSchoolField, { type CatalogSchool } from './CertificateSchoolField';
import CertificateLogosEditor from './CertificateLogosEditor';

type CertificateContest = {
  id: string;
  title: string;
  year: number;
  count: number;
  syncedAt: string;
};

type ManualCertificate = {
  code: string;
  name: string;
  contest: string;
  year: number;
  category: string;
  distinction: string;
  createdAt: string;
};

type CertificatesState = {
  sourceUrl: string | null;
  syncedAt: string | null;
  total: number;
  contests: CertificateContest[];
  manual: ManualCertificate[];
  siteUrl: string | null;
};

type ManualForm = {
  name: string;
  contest: string;
  year: string;
  category: string;
  grade: string;
  school: CatalogSchool | null;
  schoolName: string;
  place: string;
  department: string;
  distinction: string;
  issuedAt: string;
};

const CATEGORIES: Array<{ name: string; grades: string[] }> = [
  { name: 'Guacamayo', grades: ['1.º de primaria', '2.º de primaria'] },
  { name: 'Capibara', grades: ['3.º de primaria', '4.º de primaria'] },
  { name: 'Titi', grades: ['5.º de primaria', '6.º de primaria'] },
  { name: 'Jucumari', grades: ['1.º de secundaria', '2.º de secundaria'] },
  { name: 'Yaguareté', grades: ['3.º de secundaria', '4.º de secundaria'] },
  { name: 'Kuntur', grades: ['5.º de secundaria', '6.º de secundaria'] },
];

const DEPARTMENTS: Array<{ slug: string; name: string; cities: string[] }> = [
  {
    slug: 'la-paz',
    name: 'La Paz',
    cities: ['La Paz', 'El Alto', 'Viacha', 'Caranavi', 'Achacachi'],
  },
  {
    slug: 'cochabamba',
    name: 'Cochabamba',
    cities: ['Cochabamba', 'Quillacollo', 'Sacaba', 'Tiquipaya', 'Punata'],
  },
  {
    slug: 'santa-cruz',
    name: 'Santa Cruz',
    cities: ['Santa Cruz', 'Montero', 'Warnes', 'Camiri', 'Yapacaní'],
  },
  { slug: 'oruro', name: 'Oruro', cities: ['Oruro', 'Huanuni', 'Challapata', 'Caracollo'] },
  {
    slug: 'potosi',
    name: 'Potosí',
    cities: ['Potosí', 'Uyuni', 'Villazón', 'Tupiza', 'Llallagua'],
  },
  { slug: 'sucre', name: 'Chuquisaca', cities: ['Sucre', 'Monteagudo', 'Camargo', 'Padilla'] },
  { slug: 'tarija', name: 'Tarija', cities: ['Tarija', 'Yacuiba', 'Bermejo', 'Villamontes'] },
  { slug: 'beni', name: 'Beni', cities: ['Trinidad', 'Riberalta', 'Guayaramerín', 'San Borja'] },
  { slug: 'pando', name: 'Pando', cities: ['Cobija'] },
];

function citiesOf(form: ManualForm) {
  const cities = [
    ...(DEPARTMENTS.find((department) => department.slug === form.department)?.cities ?? []),
  ];
  for (const city of [form.school?.city, form.place]) {
    if (city && !cities.includes(city)) cities.push(city);
  }
  return cities;
}

const DISTINCTIONS: Array<[string, string]> = [
  ['participation', 'Participación'],
  ['merit', 'Mención de honor'],
  ['1', '1.er lugar'],
  ['2', '2.º lugar'],
  ['3', '3.er lugar'],
];

function distinctionLabel(value: string) {
  return DISTINCTIONS.find(([key]) => key === value)?.[1] ?? 'Participación';
}

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function emptyForm(state: CertificatesState | null): ManualForm {
  const recent = state?.manual[0] ?? null;
  const contest = state?.contests[0] ?? null;
  return {
    name: '',
    contest: recent?.contest ?? contest?.title ?? '',
    year: String(new Date().getFullYear()),
    category: '',
    grade: '',
    school: null,
    schoolName: '',
    place: '',
    department: '',
    distinction: 'participation',
    issuedAt: today(),
  };
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const field = document.createElement('textarea');
    field.value = value;
    document.body.appendChild(field);
    field.select();
    document.execCommand('copy');
    field.remove();
  }
}

interface Props {
  icons: Record<string, string>;
}

function iconHtml(icons: Record<string, string>, name: string): { __html: string } {
  return { __html: icons[name] || '' };
}

function formatDate(value?: string | null) {
  if (!value) return 'Nunca';
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    ? `${value.replace(' ', 'T')}Z`
    : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return 'Nunca';
  return date.toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' });
}

function sourceHost(value: string | null) {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

export default function CertificatesView({ icons }: Props) {
  const [state, setState] = React.useState<CertificatesState | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [url, setUrl] = React.useState('');
  const [busy, setBusy] = React.useState<'save' | 'sync' | 'manual' | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [form, setForm] = React.useState<ManualForm>(() => emptyForm(null));
  const [created, setCreated] = React.useState<{ code: string; name: string } | null>(null);
  const nameInput = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    window.API.getCertificates()
      .then((data: CertificatesState) => {
        setState(data);
        setEditing(!data.sourceUrl);
      })
      .catch((err: Error) => setLoadError(err.message));
  }, []);

  const saveSource = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy('save');
    try {
      const data = await window.API.saveCertificatesSource(url.trim());
      setState(data);
      setEditing(false);
      setUrl('');
      window.Toast.success('Enlace guardado. Ahora toca «Actualizar».');
    } catch (err) {
      window.Toast.error(err instanceof Error ? err.message : 'No se pudo guardar el enlace');
    } finally {
      setBusy(null);
    }
  };

  const sync = async () => {
    setBusy('sync');
    try {
      const data = await window.API.syncCertificates();
      setState(data);
      window.Toast.success(
        data.received === 1
          ? 'Se trajo 1 certificado. El sitio se publicará en unos segundos.'
          : `Se trajeron ${data.received} certificados. El sitio se publicará en unos segundos.`
      );
    } catch (err) {
      window.Toast.error(err instanceof Error ? err.message : 'No se pudo actualizar');
    } finally {
      setBusy(null);
    }
  };

  const remove = async (contest: CertificateContest) => {
    const confirmed = await window.CMSModal?.openConfirm?.({
      title: `Quitar «${contest.title}»`,
      message: `Sus ${contest.count} certificados dejarán de estar en el sitio. Si el concurso todavía lo tiene, vuelve con «Actualizar».`,
      confirmLabel: 'Quitar',
      cancelLabel: 'Cancelar',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      setState(await window.API.removeCertificatesContest(contest.id));
      window.Toast.success('Desafío quitado');
    } catch (err) {
      window.Toast.error(err instanceof Error ? err.message : 'No se pudo quitar');
    }
  };

  const update =
    (field: keyof ManualForm) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setForm((current) => {
        const next = { ...current, [field]: value };
        if (field === 'category') {
          const grades = CATEGORIES.find((category) => category.name === value)?.grades ?? [];
          if (!grades.includes(next.grade)) next.grade = '';
        }
        if (field === 'department') {
          if (next.school && next.school.department !== value) next.school = null;
          if (
            !(DEPARTMENTS.find((department) => department.slug === value)?.cities ?? []).includes(
              next.place
            )
          )
            next.place = '';
        }
        return next;
      });
    };

  const chooseSchool = (school: CatalogSchool | null) => {
    setForm((current) =>
      school
        ? {
            ...current,
            school,
            schoolName: '',
            department: school.department ?? current.department,
            place: school.city,
          }
        : { ...current, school: null }
    );
  };

  const startAdding = () => {
    setForm(emptyForm(state));
    setCreated(null);
    setAdding(true);
    requestAnimationFrame(() => nameInput.current?.focus());
  };

  const addManual = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.department) {
      window.Toast.error('Elige el departamento.');
      return;
    }
    setBusy('manual');
    try {
      const { school, schoolName, ...fields } = form;
      const data = await window.API.addManualCertificate({
        ...fields,
        school: schoolName,
        schoolCode: school?.code ?? '',
        year: Number(form.year),
      });
      setState(data);
      setCreated({ code: data.code, name: form.name.replace(/\s+/g, ' ').trim() });
      setForm((current) => ({ ...current, name: '' }));
      requestAnimationFrame(() => nameInput.current?.focus());
      window.Toast.success('Certificado agregado. El sitio se publicará en unos segundos.');
    } catch (err) {
      window.Toast.error(err instanceof Error ? err.message : 'No se pudo agregar el certificado');
    } finally {
      setBusy(null);
    }
  };

  const verifyLink = (code: string) =>
    `${state?.siteUrl || window.location.origin}/certificado?codigo=${code}`;

  const copyLink = async (code: string) => {
    await copyText(verifyLink(code));
    window.Toast.success('Enlace copiado');
  };

  const removeManual = async (certificate: ManualCertificate) => {
    const confirmed = await window.CMSModal?.openConfirm?.({
      title: `Quitar el certificado de ${certificate.name}`,
      message: 'Su enlace dejará de funcionar. Si lo vuelves a agregar, tendrá un enlace nuevo.',
      confirmLabel: 'Quitar',
      cancelLabel: 'Cancelar',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      setState(await window.API.removeManualCertificate(certificate.code));
      if (created?.code === certificate.code) setCreated(null);
      window.Toast.success('Certificado quitado');
    } catch (err) {
      window.Toast.error(err instanceof Error ? err.message : 'No se pudo quitar');
    }
  };

  if (loadError) {
    return (
      <div className="empty-state">
        <h3>Error</h3>
        <p>{loadError}</p>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="loading-state">
        <div className="spinner"></div> Cargando...
      </div>
    );
  }

  const host = sourceHost(state.sourceUrl);

  return (
    <div className="publish-page">
      <section className="publish-hero card">
        <div>
          <div className="publish-eyebrow">Certificados del concurso</div>
          <h2>
            {state.total === 0
              ? 'Todavía no hay certificados'
              : `${state.total} certificado${state.total === 1 ? '' : 's'} en el sitio`}
          </h2>
          <p>
            Los estudiantes ven el suyo en la página <strong>/certificado</strong> escribiendo su
            código personal. Última actualización: {formatDate(state.syncedAt)}
          </p>
        </div>
        <div className="publish-hero-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={sync}
            disabled={!state.sourceUrl || busy !== null}
          >
            <span dangerouslySetInnerHTML={iconHtml(icons, 'refresh')}></span>{' '}
            {busy === 'sync' ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <div className="card-title">Enlace del concurso</div>
        </div>
        {editing ? (
          <form className="publish-schedule-form" onSubmit={saveSource}>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="certificates-source">Enlace de certificados</label>
              <input
                id="certificates-source"
                type="url"
                className="form-input"
                placeholder="https://.../api/certificates/export?key=..."
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                autoComplete="off"
              />
              <span className="form-hint">
                En el concurso: Administrador → Certificados → Copiar enlace.
              </span>
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={!url.trim() || busy !== null}
            >
              {busy === 'save' ? 'Guardando...' : 'Guardar'}
            </button>
            {state.sourceUrl ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setEditing(false)}
              >
                Cancelar
              </button>
            ) : null}
          </form>
        ) : (
          <div
            className="publish-hero-actions"
            style={{ justifyContent: 'space-between', alignItems: 'center' }}
          >
            <p className="text-muted">Conectado con {host ?? 'el concurso'}.</p>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
              Cambiar enlace
            </button>
          </div>
        )}
      </section>

      <section className="card publish-changes-card">
        <div className="card-header">
          <div className="card-title">Desafíos guardados</div>
        </div>
        {state.contests.length === 0 ? (
          <div className="empty-state publish-empty-state">
            <h3>Sin desafíos</h3>
            <p>Toca «Actualizar» cuando un desafío del concurso tenga sus resultados publicados.</p>
          </div>
        ) : (
          <div className="publish-change-list">
            {state.contests.map((contest) => (
              <article className="publish-change-item" key={contest.id}>
                <div className="publish-change-main">
                  <span className="badge badge-success">{contest.year}</span>
                  <div>
                    <h3>{contest.title}</h3>
                    <p>
                      {contest.count} certificado{contest.count === 1 ? '' : 's'} · actualizado{' '}
                      {formatDate(contest.syncedAt)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ justifySelf: 'end', width: 'auto' }}
                  onClick={() => remove(contest)}
                >
                  Quitar
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card publish-changes-card">
        <div
          className="card-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <div className="card-title">Certificados individuales</div>
          {adding ? null : (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={startAdding}
              disabled={busy !== null}
            >
              Agregar persona
            </button>
          )}
        </div>

        {created ? (
          <div
            className="publish-change-item"
            style={{ marginBottom: '1rem', borderColor: 'var(--border-focus)' }}
          >
            <div className="publish-change-main">
              <div style={{ minWidth: 0 }}>
                <h3>Certificado de {created.name}</h3>
                <a
                  href={verifyLink(created.code)}
                  target="_blank"
                  rel="noreferrer"
                  style={{ wordBreak: 'break-all', fontSize: '0.875rem', color: 'var(--accent)' }}
                >
                  {verifyLink(created.code)}
                </a>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '0.5rem',
              }}
            >
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => copyLink(created.code)}
              >
                Copiar enlace
              </button>
              <a
                className="btn btn-ghost btn-sm"
                href={verifyLink(created.code)}
                target="_blank"
                rel="noreferrer"
              >
                Abrir
              </a>
            </div>
          </div>
        ) : null}

        {adding ? (
          <form onSubmit={addManual} style={{ marginBottom: '1rem' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 1fr)',
                gap: '0 1rem',
              }}
            >
              <div className="form-group">
                <label htmlFor="manual-name">Nombre completo</label>
                <input
                  id="manual-name"
                  ref={nameInput}
                  className="form-input"
                  value={form.name}
                  onChange={update('name')}
                  maxLength={80}
                  autoComplete="off"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="manual-year">Año</label>
                <input
                  id="manual-year"
                  type="number"
                  className="form-input"
                  value={form.year}
                  onChange={update('year')}
                  min={2000}
                  max={2100}
                  required
                />
              </div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr)',
                gap: '0 1rem',
              }}
            >
              <div className="form-group">
                <label htmlFor="manual-school">Colegio (opcional)</label>
                <CertificateSchoolField
                  id="manual-school"
                  department={form.department}
                  value={form.school}
                  name={form.schoolName}
                  onNameChange={(schoolName) => setForm((current) => ({ ...current, schoolName }))}
                  onChange={chooseSchool}
                />
              </div>
              <div className="form-group">
                <label htmlFor="manual-department">Departamento</label>
                <select
                  id="manual-department"
                  className="form-select"
                  value={form.department}
                  onChange={update('department')}
                  disabled={Boolean(form.school?.department)}
                  required
                  onInvalid={(event) =>
                    event.currentTarget.setCustomValidity('Elige el departamento.')
                  }
                  onInput={(event) => event.currentTarget.setCustomValidity('')}
                >
                  <option value="" disabled>
                    Elige el departamento
                  </option>
                  {DEPARTMENTS.map((department) => (
                    <option key={department.slug} value={department.slug}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="manual-place">Ciudad (opcional)</label>
                <select
                  id="manual-place"
                  className="form-select"
                  value={form.place}
                  onChange={update('place')}
                  disabled={!form.department || Boolean(form.school)}
                >
                  <option value="">
                    {form.department ? 'Sin ciudad' : 'Elige el departamento'}
                  </option>
                  {citiesOf(form).map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 2fr) repeat(4, minmax(0, 1fr))',
                gap: '0 1rem',
              }}
            >
              <div className="form-group">
                <label htmlFor="manual-contest">Desafío</label>
                <input
                  id="manual-contest"
                  className="form-input"
                  list="manual-contest-options"
                  value={form.contest}
                  onChange={update('contest')}
                  maxLength={120}
                  autoComplete="off"
                  required
                />
                <datalist id="manual-contest-options">
                  {[
                    ...new Set([
                      ...state.contests.map((contest) => contest.title),
                      ...state.manual.map((item) => item.contest),
                    ]),
                  ].map((title) => (
                    <option key={title} value={title} />
                  ))}
                </datalist>
              </div>
              <div className="form-group">
                <label htmlFor="manual-distinction">Tipo de certificado</label>
                <select
                  id="manual-distinction"
                  className="form-select"
                  value={form.distinction}
                  onChange={update('distinction')}
                >
                  {DISTINCTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="manual-category">Categoría</label>
                <select
                  id="manual-category"
                  className="form-select"
                  value={form.category}
                  onChange={update('category')}
                >
                  <option value="">
                    {form.distinction === 'participation' ? 'Sin categoría' : 'Elige una'}
                  </option>
                  {CATEGORIES.map((category) => (
                    <option key={category.name} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="manual-grade">Curso</label>
                <select
                  id="manual-grade"
                  className="form-select"
                  value={form.grade}
                  onChange={update('grade')}
                  disabled={!form.category}
                >
                  <option value="">Sin curso</option>
                  {(
                    CATEGORIES.find((category) => category.name === form.category)?.grades ?? []
                  ).map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="manual-issued">Fecha de emisión</label>
                <input
                  id="manual-issued"
                  type="date"
                  className="form-input"
                  value={form.issuedAt}
                  onChange={update('issuedAt')}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setAdding(false)}
              >
                Cerrar
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={!form.name.trim() || !form.contest.trim() || busy !== null}
              >
                {busy === 'manual' ? 'Agregando...' : 'Agregar'}
              </button>
            </div>
          </form>
        ) : null}

        {state.manual.length === 0 ? (
          adding ? null : (
            <div className="empty-state publish-empty-state">
              <h3>Todavía no hay certificados individuales</h3>
              <p>
                Para quien no está en el concurso en línea. Cada persona recibe su propio enlace
                para ver y verificar su certificado.
              </p>
            </div>
          )
        ) : (
          <div className="publish-change-list">
            {state.manual.map((certificate) => (
              <article className="publish-change-item" key={certificate.code}>
                <div className="publish-change-main">
                  <span className="badge badge-success">{certificate.year}</span>
                  <div>
                    <h3>{certificate.name}</h3>
                    <p>
                      {[
                        certificate.contest,
                        distinctionLabel(certificate.distinction),
                        certificate.category,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '0.5rem',
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => copyLink(certificate.code)}
                  >
                    Copiar enlace
                  </button>
                  <a
                    className="btn btn-ghost btn-sm"
                    href={verifyLink(certificate.code)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir
                  </a>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => removeManual(certificate)}
                  >
                    Quitar
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-header">
          <div className="card-title">Logos de los organizadores</div>
        </div>
        <CertificateLogosEditor />
      </section>
    </div>
  );
}
