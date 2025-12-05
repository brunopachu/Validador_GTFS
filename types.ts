export type ValidationStatus = 'SUCESSO' | 'AVISO' | 'ERRO' | 'INFO';

export type ValidationCategory = 'GERAL' | 'CALENDAR';

export interface ValidationResult {
  title: string;
  status: ValidationStatus;
  messages: string[];
  description?: string;
  category: ValidationCategory;
}

export type GTFSRow = Record<string, string>;
export type GTFSTable = GTFSRow[];

export interface GTFSData {
  agency: GTFSTable;
  feed_info: GTFSTable;
  routes: GTFSTable;
  trips: GTFSTable;
  stops: GTFSTable;
  stop_times: GTFSTable;
  calendar_dates: GTFSTable;
  shapes: GTFSTable;
  frequencies: GTFSTable;
  fare_attributes: GTFSTable;
  fare_rules: GTFSTable;
  [key: string]: GTFSTable; // Allow dynamic access
}

export const REPORT_DESCRIPTIONS: Record<string, string> = {
  'Service IDs Ignorados (não definidos em calendar_dates)': "Informa sobre service_ids que são usados em viagens mas não estão definidos em calendar_dates.txt, sendo por isso ignorados em algumas verificações.",
  'Duplicados em routes.txt': "Verifica se existem IDs duplicados na coluna 'route_id' do ficheiro routes.txt, o que não é permitido.",
  'Duplicados em trips.txt': "Verifica se existem IDs duplicados na coluna 'trip_id' do ficheiro trips.txt, o que não é permitido.",
  'Duplicados em stops.txt': "Verifica se existem IDs duplicados na coluna 'stop_id' do ficheiro stops.txt, o que não é permitido.",
  'Duplicados em fare_attributes.txt': "Verifica se existem IDs duplicados na coluna 'fare_id' do ficheiro fare_attributes.txt.",
  'Formato de ID em trips.txt (route_id)': "Garante que os IDs na coluna 'route_id' seguem o padrão de formato esperado (ex: '4401_0').",
  'Formato de ID em trips.txt (trip_id)': "Garante que os IDs na coluna 'trip_id' seguem o padrão de formato esperado (ex: '4401_0_1|1').",
  'Formato de ID em trips.txt (shape_id)': "Garante que os IDs na coluna 'shape_id' seguem o padrão de formato esperado (ex: 'shp_4401_0_1').",
  'Formato de ID em trips.txt (pattern_id)': "Garante que os IDs na coluna 'pattern_id' seguem o padrão de formato esperado (ex: '4401_0_1').",
  'Formato de stop_id em stops.txt (6 dígitos)': "Garante que todos os 'stop_id' no ficheiro stops.txt contêm exatamente 6 dígitos numéricos.",
  'Formato de stop_id em stop_times.txt (6 dígitos)': "Garante que todos os 'stop_id' no ficheiro stop_times.txt contêm exatamente 6 dígitos numéricos.",
  'Integridade Referencial (Elos Partidos)': "Confirma que cada ID de referência (ex: route_id em trips.txt) existe no seu ficheiro principal (ex: routes.txt), garantindo que não há 'elos partidos'.",
  'Conteúdo Fixo de agency.txt': "Valida se o conteúdo do ficheiro agency.txt corresponde exatamente aos valores esperados para o operador.",
  'Consistência de feed_info.txt': "Verifica a consistência interna do feed_info.txt e se as datas em calendar_dates.txt estão dentro do período de validade do feed.",
  'Formato Hora em trips.txt': "Assegura que a hora de início da viagem (trip_first) e a hora de fim (trip_last) estão no formato correto (HH:MM:SS)",
  'Lógica de Tempo em trips.txt': "Assegura que a hora de início da viagem (trip_first) não é posterior à hora de fim (trip_last).",
  'Coordenadas de Paragens': "Verifica se as coordenadas de latitude (-90 a 90) e longitude (-180 a 180) das paragens são geograficamente válidas.",
  'Consistência de Rotas Circulares': "Valida se as rotas marcadas como 'circulares' (circular=1) têm o mesmo local de origem e destino.",
  'Consistência Horária Trips vs Frequencies': "Verifica se o horário de início e fim de cada viagem está dentro da janela horária definida para essa viagem no ficheiro frequencies.txt.",
  'Caracteres Corrompidos / Codificação': "Verificação de Caracteres Corrompidos.",
  'Espaços em Branco Indesejados': "Verificação de Espaços em Branco no Início ou Fim de Campos de Texto.",
  'Continuidade de stop_sequence em stop_times.txt': "Verifica se a sequência de paragens (stop_sequence) é contínua e crescente.",
  // New descriptions
  'Validação do Campo "holiday"': "Verifica se o campo 'holiday' (0 ou 1) corresponde corretamente aos feriados nacionais portugueses para cada data.",
  'Validação do Campo "period"': "Verifica se o campo 'period' (1, 2 ou 3) está corretamente classificado como Escolar, Não Escolar ou Verão, de acordo com as regras definidas.",
  'Validação do Campo "day_type"': "Verifica se o campo 'day_type' (1, 2 ou 3) corresponde corretamente ao tipo de dia (Útil, Sábado ou Domingo/Feriado)."
};