import { describe, expect, test } from 'bun:test';
import { isSafeHref as siteSafe, toSafeHref } from '../../src/lib/safe-url';
import { isSafeHref as cmsSafe } from '../../cms/src/lib/safe-url';
import { renderBlogMarkdown } from '../../src/lib/blog-markdown';
import { formatInlineRichText } from '../../src/lib/rich-text';
import { searchSchools, findSchool } from '../../cms/src/certificates/schools';
import { hashPassword, verifyPassword } from '../../cms/src/auth/passwords';
import { withContentMutation } from '../../cms/src/content/mutation-lock';
import { registrationHref } from '../../src/lib/registration';
import registro from '../../src/data/registro.json';

describe('U-URL: política compartida de enlaces', () => {
  test('acepta enlaces web, contacto y rutas', () => {
    for (const href of [
      'https://bebras.bo',
      'http://localhost:4321',
      'mailto:hola@bebras.bo',
      'tel:+5911234',
      '/registro',
      '#inicio',
      '?codigo=ABCD',
      './blog',
      '../inicio',
      'blog',
      '',
    ]) {
      expect(siteSafe(href)).toBe(true);
      expect(cmsSafe(href)).toBe(true);
    }
  });
  test('rechaza protocolos peligrosos y variantes ofuscadas', () => {
    for (const href of [
      'javascript:alert(1)',
      'JaVaScRiPt:alert(1)',
      'data:text/html,x',
      'vbscript:x',
      'file:///C:/x',
      '//evil.test',
      '/\\evil.test',
      'java\nscript:alert(1)',
      'https://x\u0000.test',
      'https://',
    ]) {
      expect(siteSafe(href)).toBe(false);
      expect(cmsSafe(href)).toBe(false);
    }
  });
  test('fallback y recorte seguros', () => {
    expect(toSafeHref('  /blog  ')).toBe('/blog');
    expect(toSafeHref('javascript:x', '/')).toBe('/');
    expect(toSafeHref(undefined)).toBe('#');
  });
});

describe('U-BLOG: HTML seguro', () => {
  test('encabezados, énfasis, listas y saltos', () => {
    const html = renderBlogMarkdown(
      '# Título\n\n**acción** y *texto*\nsegunda línea\n\n- Uno\n- Dos'
    );
    for (const fragment of [
      '<h1>Título</h1>',
      '<strong>acción</strong>',
      '<em>texto</em>',
      '<br',
      '<ul>',
      '<li>Uno</li>',
    ])
      expect(html).toContain(fragment);
  });
  test('elimina script, iframe, eventos y enlaces javascript', () => {
    const html = renderBlogMarkdown(
      '<script>alert(1)</script><iframe src="https://evil.test"></iframe>\n\n<a href="javascript:alert(1)">enlace</a><img src="/images/x.webp" onerror="alert(1)">'
    );
    for (const fragment of ['<script', '<iframe', 'onerror', 'javascript:', 'alert(1)'])
      expect(html).not.toContain(fragment);
    expect(html).toContain('enlace');
  });
  test('imágenes con tamaño y carga diferida', () => {
    const html = renderBlogMarkdown('![Niña|sm](/images/prueba.webp)');
    expect(html).toContain('class="post-image post-image--sm"');
    expect(html).toContain('alt="Niña"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('decoding="async"');
  });
  test('imágenes data y protocolos relativos se eliminan', () => {
    const html = renderBlogMarkdown(
      '<img src="data:image/svg+xml,x" alt="X"><img src="//evil.test/x" alt="X">'
    );
    expect(html).not.toContain('data:image');
    expect(html).not.toContain('//evil.test');
  });
  test('tablas y separadores conservan elementos previstos', () => {
    const html = renderBlogMarkdown('| A | B |\n| --- | --- |\n| 1 | 2 |\n\n---');
    expect(html).toContain('<table>');
    expect(html).toContain('<td>1</td>');
    expect(html).toContain('class="rule-line post-divider"');
  });
  test('enlaces externos nuevos llevan protección noopener', () => {
    expect(renderBlogMarkdown('<a href="https://bebras.bo" target="_blank">Bebras</a>')).toContain(
      'rel="noopener noreferrer"'
    );
  });
  test('rich text escapa HTML y solo habilita negrita', () => {
    const html = formatInlineRichText('**Niña** <img src="x" onerror="boom()"> & "texto"');
    expect(html).toContain('<strong>Niña</strong>');
    expect(html).toContain('&lt;img');
    expect(html).toContain('&amp;');
    expect(html).toContain('&quot;');
    expect(html).not.toContain('<img');
    expect(formatInlineRichText('')).toBe('');
  });
});

describe('U-COLEGIO: catálogo', () => {
  test('tildes y mayúsculas no cambian la búsqueda', () => {
    const accented = searchSchools('Bolívar');
    expect(accented.length).toBeGreaterThan(0);
    expect(searchSchools('  BOLIVAR  ')).toEqual(accented);
  });
  test('departamento limita resultados y no expone índice privado', () => {
    const results = searchSchools('san', 'cochabamba');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((school) => school.department === 'cochabamba')).toBe(true);
    expect(results.every((school) => !('search' in school))).toBe(true);
  });
  test('máximo veinte, consulta corta y códigos inválidos', () => {
    expect(searchSchools('san').length).toBe(20);
    expect(searchSchools('a')).toEqual([]);
    expect(searchSchools(' ')).toEqual([]);
    expect(findSchool('no-existe')).toBeNull();
    const school = searchSchools('san')[0];
    expect(findSchool(` ${school.code} `)).toEqual(school);
  });
});

describe('U-AUTH: contraseñas', () => {
  test('Argon2id verifica contraseña correcta y rechaza otra', async () => {
    const hash = await hashPassword('Prueba segura ñ 2026!');
    expect(hash).toStartWith('$argon2id$');
    expect(hash).not.toContain('Prueba segura');
    expect(await verifyPassword('Prueba segura ñ 2026!', hash)).toBe(true);
    expect(await verifyPassword('Prueba segura n 2026!', hash)).toBe(false);
  });
  test('cada hash usa su propia sal', async () => {
    const a = await hashPassword('misma contraseña');
    const b = await hashPassword('misma contraseña');
    expect(a).not.toBe(b);
    expect(await verifyPassword('misma contraseña', b)).toBe(true);
  });
});

describe('U-LOCK: escrituras serializadas', () => {
  test('una segunda escritura espera y observa la primera', async () => {
    const order: string[] = [];
    let stored = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const first = withContentMutation(async () => {
      order.push('primera inicia');
      await gate;
      stored = 1;
      order.push('primera termina');
      return 1;
    });
    const second = withContentMutation(async () => {
      expect(stored).toBe(1);
      order.push('segunda inicia');
      stored += 1;
      return stored;
    });
    await Promise.resolve();
    expect(order).toEqual(['primera inicia']);
    release();
    expect(await Promise.all([first, second])).toEqual([1, 2]);
    expect(order).toEqual(['primera inicia', 'primera termina', 'segunda inicia']);
  });
  test('un fallo no bloquea escrituras posteriores', async () => {
    const first = withContentMutation(async () => {
      throw new Error('fallo previsto');
    });
    const second = withContentMutation(async () => 'guardado');
    await expect(first).rejects.toThrow('fallo previsto');
    expect(await second).toBe('guardado');
  });
});

describe('U-REGISTRO: enlace abierto o espera', () => {
  test('con enlace seguro devuelve destino directo, vacío o inseguro retorna null', () => {
    // Solo cambia el objeto importado en memoria; no escribe src/data.
    const original = registro.registration.openHref;
    try {
      registro.registration.openHref = ' https://concurso.example.test/registro ';
      expect(registrationHref()).toBe('https://concurso.example.test/registro');
      registro.registration.openHref = '';
      expect(registrationHref()).toBeNull();
      registro.registration.openHref = 'javascript:alert(1)';
      expect(registrationHref()).toBeNull();
    } finally {
      registro.registration.openHref = original;
    }
  });
});
