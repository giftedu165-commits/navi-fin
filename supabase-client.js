(function () {
  'use strict';

  const config = window.NAVI_FIN_SUPABASE || {};
  const available = Boolean(config.url && config.anonKey && window.supabase);
  let client = null;
  let userId = null;
  let channel = null;

  function fromRow(row) {
    return {
      id: row.id,
      lat: Number(row.latitude),
      lng: Number(row.longitude),
      species: row.species,
      note: row.note || '',
      photo: row.photo_url || '',
      photoPath: row.photo_path || '',
      activityRadiusKm: Number(row.activity_radius_km) || 1,
      createdAt: row.created_at,
      canDelete: Boolean(userId && row.reporter_id === userId)
    };
  }

  function fromClaimRow(row) {
    return {
      id: row.id,
      certificateNumber: row.certificate_number,
      filePath: row.file_path,
      points: Number(row.points) || 0,
      hiddenAt: row.hidden_at || '',
      createdAt: row.created_at
    };
  }

  async function initialize() {
    if (!available) return false;
    client = window.supabase.createClient(config.url, config.anonKey);
    let session = (await client.auth.getSession()).data.session;
    if (!session) {
      const result = await client.auth.signInAnonymously();
      if (result.error) throw result.error;
      session = result.data.session;
    }
    userId = session && session.user ? session.user.id : null;
    return Boolean(userId);
  }

  async function list() {
    const result = await client.from('observations').select('*').order('created_at', { ascending: true });
    if (result.error) throw result.error;
    return result.data.map(fromRow);
  }

  function dataUrlToBlob(dataUrl) {
    return fetch(dataUrl).then(function (response) { return response.blob(); });
  }

  async function create(report) {
    let photoPath = '';
    let photoUrl = '';
    if (report.photo) {
      const blob = await dataUrlToBlob(report.photo);
      photoPath = userId + '/' + crypto.randomUUID() + '.jpg';
      const upload = await client.storage.from('observation-photos').upload(photoPath, blob, {
        contentType: 'image/jpeg',
        upsert: false
      });
      if (upload.error) throw upload.error;
      photoUrl = client.storage.from('observation-photos').getPublicUrl(photoPath).data.publicUrl;
    }

    const inserted = await client.from('observations').insert({
      reporter_id: userId,
      latitude: report.lat,
      longitude: report.lng,
      species: report.species,
      note: report.note,
      photo_url: photoUrl,
      photo_path: photoPath,
      activity_radius_km: report.activityRadiusKm
    }).select().single();

    if (inserted.error) {
      if (photoPath) await client.storage.from('observation-photos').remove([photoPath]);
      throw inserted.error;
    }
    return fromRow(inserted.data);
  }

  async function remove(report) {
    const deleted = await client.from('observations').delete().eq('id', report.id);
    if (deleted.error) throw deleted.error;
    if (report.photoPath) await client.storage.from('observation-photos').remove([report.photoPath]);
  }

  async function listClaims() {
    const result = await client.from('certificate_claims').select('*').order('created_at', { ascending: false });
    if (result.error) throw result.error;
    return result.data.map(fromClaimRow);
  }

  async function submitClaim(certificateNumber, file) {
    const safeNumber = certificateNumber.toUpperCase();
    const filePath = userId + '/' + safeNumber + '-' + crypto.randomUUID() + '.pdf';
    const upload = await client.storage.from('certificate-pdfs').upload(filePath, file, {
      contentType: 'application/pdf',
      upsert: false
    });
    if (upload.error) throw upload.error;

    const inserted = await client.from('certificate_claims').insert({
      reporter_id: userId,
      certificate_number: safeNumber,
      file_path: filePath
    }).select().single();

    if (inserted.error) {
      await client.storage.from('certificate-pdfs').remove([filePath]);
      throw inserted.error;
    }
    return fromClaimRow(inserted.data);
  }

  async function getClaimUrl(filePath) {
    const result = await client.storage.from('certificate-pdfs').createSignedUrl(filePath, 60);
    if (result.error) throw result.error;
    return result.data.signedUrl;
  }

  async function hideClaim(claim) {
    const updated = await client.from('certificate_claims').update({ hidden_at: new Date().toISOString() }).eq('id', claim.id);
    if (updated.error) throw updated.error;
  }

  function subscribe(onChange) {
    if (!client || channel) return;
    channel = client.channel('public-observations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'observations' }, onChange)
      .subscribe();
  }

  window.NaviFinCloud = { available, initialize, list, create, remove, subscribe, listClaims, submitClaim, getClaimUrl, hideClaim };
})();
