import { GTFSData, GTFSRow, ValidationResult, ValidationStatus, REPORT_DESCRIPTIONS, GTFSTable } from '../types';

// Helper: limit messages
const limitarMensagens = (messages: string[], limite = 100): string[] => {
  if (messages.length > limite) {
    const suprimidos = messages.length - limite;
    const limitadas = messages.slice(0, limite);
    limitadas.push(`... (${suprimidos} mensagens adicionais suprimidas para desempenho)`);
    return limitadas;
  }
  return messages;
};

// Helper: time to seconds
const timeToSeconds = (timeStr: string | undefined): number | null => {
  if (!timeStr) return null;
  try {
    const parts = timeStr.split(':');
    if (parts.length < 3) return null;
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
  } catch {
    return null;
  }
};

// --- LOGIC PORTED FROM PYTHON ---

const getPortugueseHolidays = (): Set<string> => {
    return new Set([
        '2025-01-01', '2025-04-18', '2025-04-20', '2025-04-25',
        '2025-05-01', '2025-06-08', '2025-06-10', '2025-08-15',
        '2025-10-05', '2025-11-01', '2025-12-01', '2025-12-08',
        '2025-12-25',
        '2026-01-01', '2026-04-03', '2026-04-05', '2026-04-25',
        '2026-05-01', '2026-06-04', '2026-06-10', '2026-08-15',
        '2026-10-05', '2026-11-01', '2026-12-01', '2026-12-08',
        '2026-12-25',
        '2027-01-01'
    ]);
};

const parseDateString = (dateStr: string): Date | null => {
    if (!dateStr || dateStr.length !== 8) return null;
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1; // Month is 0-indexed in JS
    const day = parseInt(dateStr.substring(6, 8));
    return new Date(year, month, day);
};

const formatDateToISO = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getPeriod = (currentDate: Date): number => {
    const dayOfWeek = currentDate.getDay(); // 0 (Sun) to 6 (Sat)
    
    // Sábados (6) e domingos (0) -> sempre período 1
    if (dayOfWeek === 6 || dayOfWeek === 0) {
        return 1;
    }

    const isoDate = formatDateToISO(currentDate);
    
    // Período de Verão (2026-07-01 to 2026-08-31)
    if (isoDate >= '2026-07-01' && isoDate <= '2026-08-31') {
        return 3;
    }

    // Períodos Não Escolares
    if (isoDate >= '2025-12-22' && isoDate <= '2025-12-31') return 2;
    if (isoDate === '2026-01-02') return 2;
    if (isoDate >= '2026-02-16' && isoDate <= '2026-02-18') return 2;
    if (isoDate >= '2026-03-30' && isoDate <= '2026-04-02') return 2;

    // Por defeito, período escolar
    return 1;
};

const getDayType = (currentDate: Date, holidays: Set<string>): number => {
    const dayOfWeek = currentDate.getDay(); // 0 (Sun) to 6 (Sat)
    const isoDate = formatDateToISO(currentDate);

    if (holidays.has(isoDate) || dayOfWeek === 0) {
        return 3; // Domingo ou Feriado
    } else if (dayOfWeek === 6) {
        return 2; // Sábado
    } else {
        return 1; // Dia útil
    }
};

const checkCalendarSpecialRules = (calendarDates: GTFSTable): ValidationResult[] => {
    const holidays = getPortugueseHolidays();
    const holidayErrors: string[] = [];
    const periodErrors: string[] = [];
    const dayTypeErrors: string[] = [];
    const results: ValidationResult[] = [];

    // Check if optional columns exist
    if (!calendarDates || calendarDates.length === 0) return [];
    
    const hasColumns = 'holiday' in calendarDates[0] && 'period' in calendarDates[0] && 'day_type' in calendarDates[0];
    
    if (!hasColumns) {
        return [{
            title: 'Colunas Específicas em calendar_dates.txt',
            status: 'INFO',
            messages: ['O ficheiro não contém as colunas extra "holiday", "period" e "day_type", por isso as validações específicas foram ignoradas.'],
            description: 'Validação de colunas personalizadas (não-GTFS padrão).',
            category: 'CALENDAR'
        }];
    }

    calendarDates.forEach((row, index) => {
        const fileDateStr = row.date; // Assuming standard GTFS 'date' col serves as 'parts[4]' in python logic or the col is present.
        // If the custom file uses 'date' as the 5th column, PapaParse usually maps it if header=true.
        
        if (!fileDateStr) return;

        const fileDate = parseDateString(fileDateStr);
        if (!fileDate) {
             // Logic handled in general format check usually
             return; 
        }

        const dateDisplay = fileDateStr;

        // Holiday Check
        const holidayFromFile = parseInt(row.holiday);
        const isoDate = formatDateToISO(fileDate);
        const expectedHoliday = holidays.has(isoDate) ? 1 : 0;
        
        if (!isNaN(holidayFromFile) && holidayFromFile !== expectedHoliday) {
            holidayErrors.push(`Linha ${index + 2}: Data ${dateDisplay} - ERRO no 'holiday'. Esperado: ${expectedHoliday}, Ficheiro: ${holidayFromFile}`);
        }

        // Period Check
        const periodFromFile = parseInt(row.period);
        const expectedPeriod = getPeriod(fileDate);

        if (!isNaN(periodFromFile) && periodFromFile !== expectedPeriod) {
            periodErrors.push(`Linha ${index + 2}: Data ${dateDisplay} - ERRO no 'period'. Esperado: ${expectedPeriod}, Ficheiro: ${periodFromFile}`);
        }

        // Day Type Check
        const dayTypeFromFile = parseInt(row.day_type);
        const expectedDayType = getDayType(fileDate, holidays);

        if (!isNaN(dayTypeFromFile) && dayTypeFromFile !== expectedDayType) {
            dayTypeErrors.push(`Linha ${index + 2}: Data ${dateDisplay} - ERRO no 'day_type'. Esperado: ${expectedDayType}, Ficheiro: ${dayTypeFromFile}`);
        }
    });

    results.push({
        title: 'Validação do Campo "holiday"',
        status: holidayErrors.length > 0 ? 'ERRO' : 'SUCESSO',
        messages: holidayErrors.length > 0 ? limitarMensagens(holidayErrors) : ["Nenhum erro encontrado."],
        description: REPORT_DESCRIPTIONS['Validação do Campo "holiday"'],
        category: 'CALENDAR'
    });

    results.push({
        title: 'Validação do Campo "period"',
        status: periodErrors.length > 0 ? 'ERRO' : 'SUCESSO',
        messages: periodErrors.length > 0 ? limitarMensagens(periodErrors) : ["Nenhum erro encontrado."],
        description: REPORT_DESCRIPTIONS['Validação do Campo "period"'],
        category: 'CALENDAR'
    });

    results.push({
        title: 'Validação do Campo "day_type"',
        status: dayTypeErrors.length > 0 ? 'ERRO' : 'SUCESSO',
        messages: dayTypeErrors.length > 0 ? limitarMensagens(dayTypeErrors) : ["Nenhum erro encontrado."],
        description: REPORT_DESCRIPTIONS['Validação do Campo "day_type"'],
        category: 'CALENDAR'
    });

    return results;
};

// --- END LOGIC PORTED FROM PYTHON ---

const getAllServiceIdsInUse = (trips: GTFSRow[], stopTimes: GTFSRow[], frequencies: GTFSRow[]): Set<string> => {
  const ids = new Set<string>();
  
  // From trips
  trips.forEach(row => {
    if (row.service_id) ids.add(row.service_id);
  });

  const extractFromTripId = (rows: GTFSRow[]) => {
    rows.forEach(row => {
      if (row.trip_id && row.trip_id.includes('|')) {
        const parts = row.trip_id.split('|');
        if (parts.length > 0) ids.add(parts[parts.length - 1]);
      }
    });
  };

  extractFromTripId(stopTimes);
  extractFromTripId(frequencies);

  return ids;
};

const checkDuplicates = (rows: GTFSRow[], colName: string): [ValidationStatus, string[]] => {
  if (!rows || rows.length === 0) return ['AVISO', [`Ficheiro vazio ou não carregado.`]];
  if (rows.length > 0 && !(colName in rows[0])) return ['AVISO', [`A coluna '${colName}' não foi encontrada.`]];

  const seen = new Map<string, number[]>();
  rows.forEach((row, index) => {
    const val = row[colName];
    if (val) {
      if (!seen.has(val)) seen.set(val, []);
      seen.get(val)?.push(index + 2);
    }
  });

  const messages: string[] = [];
  seen.forEach((lines, id) => {
    if (lines.length > 1) {
      messages.push(`ID '${id}' duplicado nas linhas: ${lines.join(', ')}`);
    }
  });

  if (messages.length === 0) return ['SUCESSO', ["Nenhum ID duplicado encontrado."]];
  return ['ERRO', limitarMensagens(messages)];
};

const checkIdFormat = (rows: GTFSRow[], colName: string, pattern: RegExp): [ValidationStatus, string[]] => {
  if (!rows || rows.length === 0) return ['SUCESSO', []]; // Empty file check handled elsewhere or irrelevant
  if (!(colName in rows[0])) return ['AVISO', [`A coluna '${colName}' não foi encontrada.`]];

  const messages: string[] = [];
  rows.forEach((row, index) => {
    const val = row[colName];
    if (val && val.trim() !== '' && !pattern.test(val)) {
      messages.push(`Linha ${index + 2}: o ID '${val}' não corresponde ao padrão.`);
    }
  });

  if (messages.length === 0) return ['SUCESSO', [`Todos os IDs na coluna '${colName}' correspondem ao formato esperado.`]];
  return ['ERRO', limitarMensagens(messages)];
};

const checkTextEncoding = (data: GTFSData): [ValidationStatus, string[]] => {
  const colunasTexto: Record<string, string[]> = {
    "trips": ["trip_headsign", "pattern_short_name"],
    "routes": ["route_long_name", "route_short_name", "route_desc"],
    "stops": ["stop_name", "stop_desc"],
    "agency": ["agency_name", "agency_url", "agency_timezone", "agency_lang", "agency_phone", "agency_fare_url"],
    "feed_info": ["feed_publisher_name", "feed_publisher_url", "feed_lang", "feed_version", "feed_desc"],
  };

  const patternInvalid = /[\ufffd\?\x00\!\#\+\$\%\&\<\<\;\@]/;
  const messages: string[] = [];

  for (const [filename, cols] of Object.entries(colunasTexto)) {
    const rows = data[filename];
    if (!rows) continue;

    cols.forEach(col => {
        rows.forEach((row, index) => {
            if (row[col] && patternInvalid.test(row[col])) {
                 messages.push(`${filename}.txt (coluna ${col}, linha ${index + 2}): '${row[col]}' contém caracteres inválidos.`);
            }
        });
    });
  }

  if (messages.length === 0) return ['SUCESSO', ["Nenhum problema de codificação ou caracteres nulos encontrado nos campos de texto."]];
  return ['ERRO', limitarMensagens(messages)];
};

const checkForTrailingSpaces = (data: GTFSData): [ValidationStatus, string[]] => {
    const messages: string[] = [];
    
    // 1. Empty rows check
    Object.entries(data).forEach(([filename, rows]) => {
        rows.forEach((row, index) => {
            // Check if object has values that are not empty strings or null
            const hasData = Object.values(row).some(v => v && v.trim() !== '');
            if (!hasData) {
                 messages.push(`${filename}.txt (linha ${index + 2}): contém apenas vírgulas (sem dados).`);
            }
        });
    });

    // 2. Spaces check
    const colunasTexto: Record<string, string[]> = {
        "trips": ["trip_headsign", "pattern_short_name"],
        "routes": ["route_long_name", "route_short_name", "route_desc"],
        "stops": ["stop_name", "stop_desc"],
        "agency": ["agency_name"],
        "feed_info": ["feed_publisher_name"],
    };

    const regexStart = /^\s/;
    const regexEnd = /\s$/;
    const regexDouble = / {2,}/;

    for (const [filename, cols] of Object.entries(colunasTexto)) {
        const rows = data[filename];
        if (!rows) continue;
        cols.forEach(col => {
            rows.forEach((row, index) => {
                const val = row[col];
                if (!val) return;
                
                if (regexStart.test(val) || regexEnd.test(val) || regexDouble.test(val)) {
                    const displayValue = val.replace(/ /g, '•');
                    const tipos = [];
                    if (regexStart.test(val)) tipos.push("espaço no início");
                    if (regexEnd.test(val)) tipos.push("espaço no fim");
                    if (regexDouble.test(val)) tipos.push("espaços duplos");
                    
                    messages.push(`${filename}.txt (coluna ${col}, linha ${index + 2}): '${displayValue}' contém ${tipos.join(' e ')}.`);
                }
            });
        });
    }

    if (messages.length === 0) return ['SUCESSO', ["Nenhum problema de formatação textual encontrado."]];
    const isError = messages.some(m => m.includes('sem dados'));
    return [isError ? 'ERRO' : 'AVISO', limitarMensagens(messages)];
};

const checkAgencyContent = (agency: GTFSTable): [ValidationStatus, string[]] => {
    const messages: string[] = [];
    const expectedHeader = ['agency_id', 'agency_name', 'agency_url', 'agency_timezone', 'agency_lang', 'agency_phone', 'agency_fare_url', 'agency_email'];
    const expectedData = ['44', 'Alsa Todi', 'https://www.alsatodi.pt', 'Europe/Lisbon', 'pt', '210410400', 'https://www.carrismetropolitana.pt/tarifarios', 'passageiros@alsa.com'];
    
    if (!agency || agency.length === 0) return ['ERRO', ["Arquivo agency.txt vazio ou ausente."]];

    // Check header (keys of first object)
    const headers = Object.keys(agency[0]);
    // This is loose because CSV parsing might order differently or have BOM, strictly we check if expected are present
    const missingHeaders = expectedHeader.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) messages.push(`Colunas em falta: ${missingHeaders.join(', ')}`);

    if (agency.length !== 1) {
        messages.push(`O ficheiro deve ter 1 linha de dados, mas tem ${agency.length}.`);
    } else {
        const row = agency[0];
        expectedHeader.forEach((field, i) => {
            if (row[field] !== expectedData[i]) {
                messages.push(`No campo '${field}': Esperado '${expectedData[i]}', mas encontrado '${row[field] || ''}'.`);
            }
        });
    }

    if (messages.length === 0) return ['SUCESSO', ["Conteúdo do ficheiro está de acordo com o esperado."]];
    return ['ERRO', limitarMensagens(messages)];
};

const checkFeedInfoConsistency = (feedInfo: GTFSTable, calendarDates: GTFSTable): [ValidationStatus, string[]] => {
    const messages: string[] = [];
    let status: ValidationStatus = 'SUCESSO';

    if (!feedInfo || feedInfo.length !== 1) {
        return ['ERRO', [`O ficheiro deve ter 1 linha de dados, mas tem ${feedInfo?.length || 0}.`]];
    }

    const row = feedInfo[0];
    const expectedValues: Record<string, string> = {
        'feed_publisher_name': 'TML',
        'feed_publisher_url': 'http://www.tmlmobilidade.pt',
        'feed_lang': 'pt'
    };

    for (const [col, expected] of Object.entries(expectedValues)) {
        if (row[col] !== expected) {
            messages.push(`Conteúdo incorreto na coluna '${col}'. Esperado: '${expected}', Encontrado: '${row[col] || ''}'`);
        }
    }

    // Dates
    try {
        const startStr = row['feed_start_date'];
        const endStr = row['feed_end_date'];
        
        if (startStr && endStr) {
            // Simple string comparison for YYYYMMDD usually works, but lets parse numbers
            const startNum = parseInt(startStr);
            const endNum = parseInt(endStr);

            if (calendarDates) {
                calendarDates.forEach((cRow, idx) => {
                    if (cRow.date) {
                        const dateNum = parseInt(cRow.date);
                        if (dateNum < startNum || dateNum > endNum) {
                            messages.push(`A data '${cRow.date}' (linha ${idx + 2} de calendar_dates.txt) está fora da janela do feed.`);
                        }
                    }
                });
            }
        }
    } catch (e) {
        messages.push(`Falha ao processar datas.`);
    }

    // Version vs Desc
    const version = row['feed_version'] || '';
    const desc = row['feed_desc'] || '';
    if (version && desc) {
        if (!desc.endsWith(version.replace('.', '_'))) {
             messages.push(`Inconsistência entre 'feed_version' (${version}) e 'feed_desc' (${desc}).`);
        }
    } else {
        status = 'AVISO';
        messages.push("Não foi possível verificar a consistência entre 'feed_version' e 'feed_desc' (campos em falta).");
    }

    if (messages.length > 0 && status === 'SUCESSO') status = 'ERRO';
    if (messages.length === 0) messages.push("Consistência verificada com sucesso.");

    return [status, limitarMensagens(messages)];
};

const checkTimeFormat = (trips: GTFSTable): [ValidationStatus, string[]] => {
    if (!trips || trips.length === 0) return ['SUCESSO', []];
    if (!('trip_first' in trips[0]) || !('trip_last' in trips[0])) return ['AVISO', ["Colunas 'trip_first' ou 'trip_last' não encontradas."]];

    const timePattern = /^\d{1,2}:\d{2}:\d{2}$/;
    const messages: string[] = [];

    trips.forEach((row, index) => {
        ['trip_first', 'trip_last'].forEach(field => {
            const val = row[field];
            if (val) {
                if (!timePattern.test(val)) {
                    messages.push(`Linha ${index + 2}: ${field} '${val}' não está no formato HH:MM:SS para trip_id '${row.trip_id}'.`);
                } else {
                    const parts = val.split(':').map(Number);
                    if (parts[1] >= 60 || parts[2] >= 60) {
                         messages.push(`Linha ${index + 2}: ${field} '${val}' tem minutos ou segundos inválidos.`);
                    }
                }
            }
        });
    });

    if (messages.length === 0) return ['SUCESSO', ["Todos os campos de tempo estão no formato HH:MM:SS correto."]];
    return ['ERRO', limitarMensagens(messages)];
};

const checkTripTimeLogic = (trips: GTFSTable): [ValidationStatus, string[]] => {
    if (!trips || trips.length === 0) return ['SUCESSO', []];
    const messages: string[] = [];

    trips.forEach((row, index) => {
        const first = timeToSeconds(row.trip_first);
        const last = timeToSeconds(row.trip_last);

        if (first !== null && last !== null) {
            let adjustedLast = last;
            // Logic from python: if last < first and last < 4am (approx), add 24h
            if (last < first && last < (4 * 3600)) {
                adjustedLast += 86400;
            }
            if (first > adjustedLast) {
                messages.push(`Linha ${index + 2}: trip_first (${row.trip_first}) > trip_last (${row.trip_last}) para o trip_id '${row.trip_id}'.`);
            }
        }
    });

    if (messages.length === 0) return ['SUCESSO', ["Nenhum erro de lógica encontrado."]];
    return ['ERRO', limitarMensagens(messages)];
};

const checkStopCoordinates = (stops: GTFSTable): [ValidationStatus, string[]] => {
    if (!stops || stops.length === 0) return ['SUCESSO', []];
    const messages: string[] = [];

    stops.forEach((row, index) => {
        const lat = parseFloat(row.stop_lat || '');
        const lon = parseFloat(row.stop_lon || '');

        if (isNaN(lat) || lat < -90 || lat > 90) {
            messages.push(`Linha ${index + 2}: Latitude '${row.stop_lat}' inválida para stop_id '${row.stop_id}'.`);
        }
        if (isNaN(lon) || lon < -180 || lon > 180) {
            messages.push(`Linha ${index + 2}: Longitude '${row.stop_lon}' inválida para stop_id '${row.stop_id}'.`);
        }
    });

    if (messages.length === 0) return ['SUCESSO', ["Nenhuma coordenada inválida encontrada."]];
    return ['ERRO', limitarMensagens(messages)];
};

const checkReferentialIntegrity = (
    childDf: GTFSTable, 
    childName: string, 
    childCol: string, 
    parentDf: GTFSTable, 
    parentName: string, 
    parentCol: string, 
    idsToIgnore: Set<string>
): string[] => {
    const messages: string[] = [];
    if (!childDf || !parentDf) return [];
    
    // Create lookup set for parent
    const parentIds = new Set(parentDf.map(r => r[parentCol]).filter(x => x));
    
    // Special case for freq to trips
    const isFreqToTrips = (childName === 'frequencies.txt' && parentName === 'trips.txt');
    const parentIdsBase = new Set<string>();
    if (isFreqToTrips) {
        parentIds.forEach(pid => {
            if (pid && typeof pid === 'string') {
                parentIdsBase.add(pid.split('|')[0]);
            }
        });
    }

    childDf.forEach((row, index) => {
        const childId = row[childCol];
        if (!childId) return;

        if (childCol === 'service_id' && idsToIgnore.has(childId)) return;
        
        if ((childName === 'stop_times.txt' || childName === 'frequencies.txt') && childCol === 'trip_id') {
             if (childId.includes('|')) {
                 const suffix = childId.split('|').pop();
                 if (suffix && idsToIgnore.has(suffix)) return;
             }
        }

        let found = false;
        if (isFreqToTrips) {
            if (parentIds.has(childId) || parentIdsBase.has(childId)) found = true;
        } else {
            if (parentIds.has(childId)) found = true;
        }

        if (!found) {
            messages.push(`No ficheiro '${childName}', linha ${index + 2}, o '${childCol}' com valor '${childId}' não foi encontrado em '${parentCol}' do ficheiro '${parentName}'.`);
        }
    });

    return limitarMensagens(messages);
};

const checkStopSequenceContinuity = (stopTimes: GTFSTable): [ValidationStatus, string[]] => {
    if (!stopTimes || stopTimes.length === 0) return ['SUCESSO', []];
    if (!('stop_sequence' in stopTimes[0]) || !('trip_id' in stopTimes[0])) {
        return ['AVISO', ["Colunas 'stop_sequence' ou 'trip_id' não encontradas em stop_times.txt."]];
    }

    // Filter valid rows (shape_dist != 0)
    // Note: To match python exactly, we must preserve original line numbers.
    type RowWithLine = GTFSRow & { original_line: number };
    const validRows = stopTimes.map((row, idx) => ({ ...row, original_line: idx + 2 } as RowWithLine))
        .filter(r => r.shape_dist_traveled !== '0' && r.shape_dist_traveled !== '' && r.shape_dist_traveled !== undefined);

    // Group by trip_id
    // This is simplified compared to the "trip group" logic in Python, assuming trip_ids are contiguous blocks usually.
    // However, to be robust, we should sort by trip_id and sequence if not already. 
    // The python script groups by "contiguous" blocks of trip_id.
    
    const messages: string[] = [];
    
    // Let's iterate linearly to identify blocks
    let currentTripId = null;
    let currentBlock: typeof validRows = [];
    const processBlock = (block: typeof validRows) => {
        if (block.length < 2) return;
        // Sort block by sequence to ensure order
        block.sort((a, b) => parseInt(a.stop_sequence) - parseInt(b.stop_sequence));
        
        for (let i = 0; i < block.length - 1; i++) {
            const curr = parseInt(block[i].stop_sequence);
            const next = parseInt(block[i+1].stop_sequence);
            if (isNaN(curr) || isNaN(next)) {
                 messages.push(`trip_id '${block[i].trip_id}': sequence inválida.`);
                 continue;
            }
            if (next !== curr + 1) {
                messages.push(`trip_id '${block[i].trip_id}' (linhas ${block[i].original_line} e ${block[i+1].original_line}): salto na sequência (de ${curr} para ${next}). Esperado: ${curr + 1}.`);
            }
        }
    };

    for (const row of validRows) {
        if (row.trip_id !== currentTripId) {
            processBlock(currentBlock);
            currentTripId = row.trip_id;
            currentBlock = [row];
        } else {
            // Check for line break continuity (Python logic: diff > 1)
            const lastRow = currentBlock[currentBlock.length - 1];
            if (row.original_line - lastRow.original_line > 1) {
                 processBlock(currentBlock);
                 currentBlock = [row];
            } else {
                currentBlock.push(row);
            }
        }
    }
    processBlock(currentBlock); // Last block

    if (messages.length === 0) return ['SUCESSO', ["Todas as sequências de paragens são contínuas e crescentes (+1)."]];
    return ['ERRO', limitarMensagens(messages)];
};

const checkCircularRoute = (routes: GTFSTable): [ValidationStatus, string[]] => {
    if (!routes) return ['SUCESSO', []];
    const messages: string[] = [];
    
    routes.forEach((row, index) => {
        if (row.circular === '1') {
            if (row.route_origin !== row.route_destination) {
                messages.push(`Linha ${index + 2}: a rota circular '${row.route_id}' tem origem e destino diferentes.`);
            }
        }
    });
    
    if (messages.length === 0) return ['SUCESSO', ["Nenhuma inconsistência encontrada em rotas circulares."]];
    return ['ERRO', limitarMensagens(messages)];
};

const checkTripInFrequencyWindow = (trips: GTFSTable, frequencies: GTFSTable): [ValidationStatus, string[]] => {
    if (!trips || !frequencies) return ['SUCESSO', []];
    const messages: string[] = [];
    
    // Build frequency windows map
    const freqWindows: Record<string, [number, number][]> = {};
    frequencies.forEach(row => {
        const tid = row.trip_id;
        const start = timeToSeconds(row.start_time);
        const end = timeToSeconds(row.end_time);
        if (tid && start !== null && end !== null) {
            if (!freqWindows[tid]) freqWindows[tid] = [];
            freqWindows[tid].push([start, end]);
        }
    });

    trips.forEach((row, index) => {
        const tid = row.trip_id;
        if (!tid || !freqWindows[tid]) return;

        let tFirst = timeToSeconds(row.trip_first);
        let tLast = timeToSeconds(row.trip_last);

        if (tFirst === null || tLast === null) return;

        const windows = freqWindows[tid];
        // Logic for night adjustment
        const maxEnd = Math.max(...windows.map(w => w[1]));
        if (maxEnd >= 86400) {
            if (tFirst < 18000) tFirst += 86400;
            if (tLast < 18000) tLast += 86400;
        }

        const firstValid = windows.some(([s, e]) => tFirst! >= s && tFirst! <= e);
        const lastValid = windows.some(([s, e]) => tLast! >= s && tLast! <= e);

        if (!firstValid) messages.push(`Linha ${index + 2} (trips.txt): O trip_first '${row.trip_first}' para o trip id '${tid}' está fora das janelas de horário.`);
        if (!lastValid) messages.push(`Linha ${index + 2} (trips.txt): O trip_last '${row.trip_last}' para o trip id '${tid}' está fora das janelas de horário.`);
    });

    if (messages.length === 0) return ['SUCESSO', ["Todas as viagens com frequência estão dentro das suas janelas horárias."]];
    return ['ERRO', limitarMensagens(messages)];
};


export const runValidations = (data: GTFSData): ValidationResult[] => {
    const results: ValidationResult[] = [];
    
    const addResult = (title: string, res: [ValidationStatus, string[]]) => {
        results.push({
            title,
            status: res[0],
            messages: res[1],
            description: REPORT_DESCRIPTIONS[title],
            category: 'GERAL'
        });
    };

    // Service IDs ignored
    const usedIds = getAllServiceIdsInUse(data.trips || [], data.stop_times || [], data.frequencies || []);
    const calendarIds = new Set((data.calendar_dates || []).map(r => r.service_id));
    const ignoredIds = new Set<string>();
    usedIds.forEach(id => {
        if (!calendarIds.has(id)) ignoredIds.add(id);
    });
    
    if (ignoredIds.size > 0) {
        const sorted = Array.from(ignoredIds).sort().slice(0, 50);
        let msg = `${ignoredIds.size} Service IDs encontrados e ignorados: ${sorted.join(', ')}`;
        if (ignoredIds.size > 50) msg += "...";
        addResult('Service IDs Ignorados (não definidos em calendar_dates)', ['INFO', [msg]]);
    }

    addResult('Duplicados em routes.txt', checkDuplicates(data.routes, 'route_id'));
    addResult('Duplicados em trips.txt', checkDuplicates(data.trips, 'trip_id'));
    addResult('Duplicados em stops.txt', checkDuplicates(data.stops, 'stop_id'));
    addResult('Duplicados em fare_attributes.txt', checkDuplicates(data.fare_attributes, 'fare_id'));

    addResult('Formato de ID em trips.txt (route_id)', checkIdFormat(data.trips, 'route_id', /^\w+_\w+$/));
    addResult('Formato de ID em trips.txt (trip_id)', checkIdFormat(data.trips, 'trip_id', /^\w+_\w+_\w+\|\w+$/));
    addResult('Formato de ID em trips.txt (shape_id)', checkIdFormat(data.trips, 'shape_id', /^shp_\w+_\w+_\w+$/));
    addResult('Formato de ID em trips.txt (pattern_id)', checkIdFormat(data.trips, 'pattern_id', /^\w+_\w+_\w+$/));
    addResult('Formato de stop_id em stops.txt (6 dígitos)', checkIdFormat(data.stops, 'stop_id', /^\d{6}$/));
    addResult('Formato de stop_id em stop_times.txt (6 dígitos)', checkIdFormat(data.stop_times, 'stop_id', /^\d{6}$/));

    addResult('Continuidade de stop_sequence em stop_times.txt', checkStopSequenceContinuity(data.stop_times));
    addResult('Caracteres Corrompidos / Codificação', checkTextEncoding(data));
    addResult('Espaços em Branco Indesejados', checkForTrailingSpaces(data));
    addResult('Conteúdo Fixo de agency.txt', checkAgencyContent(data.agency));
    addResult('Consistência de feed_info.txt', checkFeedInfoConsistency(data.feed_info, data.calendar_dates));
    addResult('Formato Hora em trips.txt', checkTimeFormat(data.trips));
    addResult('Lógica de Tempo em trips.txt', checkTripTimeLogic(data.trips));
    addResult('Coordenadas de Paragens', checkStopCoordinates(data.stops));
    addResult('Consistência de Rotas Circulares', checkCircularRoute(data.routes));
    addResult('Consistência Horária Trips vs Frequencies', checkTripInFrequencyWindow(data.trips, data.frequencies));

    // Referential Integrity
    const riMessages: string[] = [];
    riMessages.push(...checkReferentialIntegrity(data.trips, 'trips.txt', 'route_id', data.routes, 'routes.txt', 'route_id', new Set()));
    riMessages.push(...checkReferentialIntegrity(data.trips, 'trips.txt', 'service_id', data.calendar_dates, 'calendar_dates.txt', 'service_id', ignoredIds));
    riMessages.push(...checkReferentialIntegrity(data.trips, 'trips.txt', 'shape_id', data.shapes, 'shapes.txt', 'shape_id', new Set()));
    riMessages.push(...checkReferentialIntegrity(data.stop_times, 'stop_times.txt', 'trip_id', data.trips, 'trips.txt', 'trip_id', ignoredIds));
    riMessages.push(...checkReferentialIntegrity(data.stop_times, 'stop_times.txt', 'stop_id', data.stops, 'stops.txt', 'stop_id', new Set()));
    riMessages.push(...checkReferentialIntegrity(data.frequencies, 'frequencies.txt', 'trip_id', data.trips, 'trips.txt', 'trip_id', ignoredIds));
    riMessages.push(...checkReferentialIntegrity(data.fare_rules, 'fare_rules.txt', 'fare_id', data.fare_attributes, 'fare_attributes.txt', 'fare_id', new Set()));
    riMessages.push(...checkReferentialIntegrity(data.fare_rules, 'fare_rules.txt', 'route_id', data.routes, 'routes.txt', 'route_id', new Set()));

    if (riMessages.length === 0) {
        addResult('Integridade Referencial (Elos Partidos)', ['SUCESSO', ["Nenhum erro de integridade referencial encontrado."]]);
    } else {
        addResult('Integridade Referencial (Elos Partidos)', ['ERRO', limitarMensagens(riMessages)]);
    }

    // --- ADD NEW CALENDAR VALIDATIONS ---
    const calendarResults = checkCalendarSpecialRules(data.calendar_dates);
    results.push(...calendarResults);

    return results;
};