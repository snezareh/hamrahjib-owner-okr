(function () {
  const spreadsheetId = '1Fo-zSlp5z_obLU8QQULT7vE3UPRiOhpzx40l0SR8urQ';
  const endpoint = (sheet, callback) => `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=responseHandler:${callback}&sheet=${encodeURIComponent(sheet)}&_=${Date.now()}`;

  const numberValue = value => {
    const clean = String(value ?? '').trim().replace(/,/g, '').replace(/%$/, '');
    if (!clean) return null;
    const parsed = Number(clean);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const statusValue = value => {
    const normalized = String(value || '').trim().toLowerCase();
    return ['on', 'off', 'risk', 'pending', 'review'].includes(normalized) ? normalized : 'review';
  };
  function fetchSheet(name) {
    return new Promise((resolve, reject) => {
      const callback = `hamrahjibSheet${Math.random().toString(36).slice(2)}`;
      const script = document.createElement('script');
      const cleanup = () => { delete window[callback]; script.remove(); clearTimeout(timer); };
      const timer = setTimeout(() => { cleanup(); reject(new Error(`Google Sheet ${name}: timeout`)); }, 12000);
      window[callback] = response => {
        if (response?.status !== 'ok') { cleanup(); reject(new Error(`Google Sheet ${name}: invalid response`)); return; }
        const columns = response.table.cols.map(column => column.label);
        const rows = response.table.rows.map(row => Object.fromEntries(columns.map((column, index) => {
          const cell = row.c[index];
          return [column, cell?.f ?? cell?.v ?? ''];
        })));
        cleanup(); resolve(rows);
      };
      script.onerror = () => { cleanup(); reject(new Error(`Google Sheet ${name}: network error`)); };
      script.src = endpoint(name, callback);
      document.head.appendChild(script);
    });
  }

  window.okrDataReady = (async () => {
    try {
      const [objectiveRows, krRows, weeklyRows] = await Promise.all([
        fetchSheet('Objectives'), fetchSheet('Key Results'), fetchSheet('Weekly Reports')
      ]);
      const currentById = new Map(okrObjectives.map(objective => [objective.id, objective]));
      const krByObjective = new Map();
      krRows.forEach(row => {
        const id = row['Objective ID'];
        if (!id) return;
        if (!krByObjective.has(id)) krByObjective.set(id, []);
        krByObjective.get(id).push(row);
      });
      const nextObjectives = objectiveRows.map(row => {
        const id = row['Objective ID'];
        const previous = currentById.get(id) || {};
        const previousKrs = previous.krs || [];
        const krs = (krByObjective.get(id) || []).map((krRow, index) => {
          const fallback = previousKrs.find(item => item.title === krRow['Key Result']) || previousKrs[index] || {};
          return {
            ...fallback,
            title: krRow['Key Result'] || fallback.title || '', owner: krRow.Owner || fallback.owner || row.Owner || '',
            kpi: krRow.KPI || fallback.kpi || '', target: numberValue(krRow.Target), actual: numberValue(krRow.Actual),
            weight: numberValue(krRow['Weight %']) ?? 0, progress: numberValue(krRow['Progress %']),
            status: statusValue(krRow.Status), blocker: krRow.Blocker || undefined
          };
        });
        return { ...previous, id, team: row.Team || previous.team || '', owner: row.Owner || previous.owner || '', title: row.Objective || previous.title || '', krs };
      }).filter(objective => objective.id && objective.krs.length);
      if (!nextObjectives.length) throw new Error('No usable OKR rows returned');
      okrObjectives.splice(0, okrObjectives.length, ...nextObjectives);
      window.sheetWeeklyReports = weeklyRows;
      window.sheetSyncState = { ok: true, updatedAt: new Date(), spreadsheetId };
    } catch (error) {
      console.warn('Using bundled OKR fallback data.', error);
      window.sheetWeeklyReports = [];
      window.sheetSyncState = { ok: false, updatedAt: null, spreadsheetId };
    }
  })();
})();
