/**
 * Vercel Serverless Function — DART API 프록시
 * 환경변수 DART_API_KEY 에 키를 보관하고 클라이언트에 노출하지 않음
 *
 * 사용법: GET /api/dart?path=<endpoint>&<param>=<value>&...
 *   path    : DART API 엔드포인트명 (확장자 제외)
 *             예) company, fnlttSinglAcnt, hyslrSttus, exctvSttus, alotMatter
 *   나머지  : DART API 파라미터 (crtfc_key 제외 — 서버에서 자동 주입)
 *
 * 예시:
 *   /api/dart?path=company&stock_code=005930
 *   /api/dart?path=fnlttSinglAcnt&corp_code=00126380&bsns_year=2024&reprt_code=11013
 */

export default async function handler(req, res) {
  // CORS — 동일 도메인 + localhost 허용
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.DART_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'DART_API_KEY 환경변수가 설정되지 않았습니다.',
      hint: 'Vercel 대시보드 → Settings → Environment Variables 에서 DART_API_KEY 를 추가하세요.'
    });
  }

  const { path, ...params } = req.query;
  if (!path) {
    return res.status(400).json({ error: 'path 파라미터가 필요합니다.' });
  }

  // 허용된 엔드포인트만 프록시 (보안)
  const ALLOWED = new Set([
    'company', 'fnlttSinglAcnt', 'fnlttSinglAcntAll',
    'hyslrSttus', 'exctvSttus', 'alotMatter',
    'fnlttCmpnyIndx', 'fnlttMultiAcnt',
  ]);
  if (!ALLOWED.has(path)) {
    return res.status(400).json({ error: `허용되지 않은 엔드포인트: ${path}` });
  }

  try {
    const dartUrl = new URL(`https://opendart.fss.or.kr/api/${path}.json`);
    dartUrl.searchParams.set('crtfc_key', apiKey);
    Object.entries(params).forEach(([k, v]) => {
      if (v != null) dartUrl.searchParams.set(k, v);
    });

    const dartResp = await fetch(dartUrl.toString(), {
      headers: { 'User-Agent': 'signnith/1.0' },
      signal: AbortSignal.timeout(10000),
    });

    if (!dartResp.ok) {
      return res.status(dartResp.status).json({ error: `DART 응답 오류: ${dartResp.status}` });
    }

    const data = await dartResp.json();

    // 캐시 설정: 재무데이터는 1시간, 기업정보는 24시간
    const isFinancial = ['fnlttSinglAcnt','fnlttSinglAcntAll','fnlttMultiAcnt'].includes(path);
    const maxAge = isFinancial ? 3600 : 86400;
    res.setHeader('Cache-Control', `public, s-maxage=${maxAge}, stale-while-revalidate=60`);

    return res.status(200).json(data);
  } catch (err) {
    if (err.name === 'TimeoutError') {
      return res.status(504).json({ error: 'DART API 응답 시간 초과' });
    }
    return res.status(500).json({ error: err.message });
  }
}
