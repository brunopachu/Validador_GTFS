import React, { useState } from 'react';
import JSZip from 'jszip';
import Papa from 'papaparse';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileText, Download, RotateCcw } from 'lucide-react';

import { FileUpload } from './components/FileUpload';
import { ValidationReport } from './components/ValidationReport';
import { GTFSData, GTFSTable, ValidationResult } from './types';
import { runValidations } from './utils/gtfsValidation';

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ValidationResult[] | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [generationTime, setGenerationTime] = useState<string>('');

  const processFile = async (file: File) => {
    setLoading(true);
    setFileName(file.name);
    setResults(null);
    setGenerationTime(new Date().toLocaleString());

    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      
      const gtfsData: Partial<GTFSData> = {};
      const fileNames = [
        'agency', 'feed_info', 'routes', 'trips', 'stops', 
        'stop_times', 'calendar_dates', 'shapes', 'frequencies', 
        'fare_attributes', 'fare_rules'
      ];

      // Parse all required files
      await Promise.all(fileNames.map(async (name) => {
        const fileInZip = zipContent.file(`${name}.txt`);
        if (fileInZip) {
          const content = await fileInZip.async('string');
          const parsed = Papa.parse(content, {
            header: true,
            skipEmptyLines: true,
            transform: (v) => v.trim() // Trim all values
          });
          gtfsData[name] = parsed.data as GTFSTable;
        } else {
            // If essential files are missing, we treat them as empty arrays to avoid crashes, 
            // specific validators checks for emptiness.
            gtfsData[name] = []; 
        }
      }));

      // Run validations
      // Using setTimeout to allow UI to render loading state before heavy calculation
      setTimeout(() => {
        try {
            const validationResults = runValidations(gtfsData as GTFSData);
            setResults(validationResults);
        } catch (e) {
            console.error(e);
            alert("Erro ao validar dados. Verifique a consola.");
        } finally {
            setLoading(false);
        }
      }, 100);

    } catch (error) {
      console.error(error);
      alert('Erro ao ler o ficheiro ZIP. Certifique-se que é um GTFS válido.');
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    if (!results) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc: any = new jsPDF();
    doc.setFontSize(18);
    doc.text('Relatório de Validação GTFS', 14, 22);
    
    doc.setFontSize(10);
    doc.text(`Gerado em: ${generationTime}`, 14, 30);
    doc.text(`Ficheiro: ${fileName}`, 14, 35);

    let yPos = 45;

    results.forEach((res) => {
      // Add a page if we are too low
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      // Title
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      
      // Color code status
      if (res.status === 'SUCESSO') doc.setTextColor(0, 150, 0);
      else if (res.status === 'ERRO') doc.setTextColor(200, 0, 0);
      else if (res.status === 'AVISO') doc.setTextColor(200, 150, 0);
      
      doc.text(`[${res.status}] ${res.title}`, 14, yPos);
      yPos += 7;

      // Messages
      if (res.messages.length > 0) {
        const bodyData = res.messages.map(m => [m]);
        
        autoTable(doc, {
          startY: yPos,
          body: bodyData,
          theme: 'plain',
          styles: { fontSize: 8, font: 'courier' },
          margin: { left: 14 },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          didDrawPage: (data: any) => {
             // Reset yPos for next loop iteration
             yPos = data.cursor.y + 10;
          }
        });
        // Update yPos based on where table ended (using internal state of autotable usually, but simplified here)
        // Since we can't easily get the last Y from the loop without state, we rely on didDrawPage to update a var or we force check
        // For simplicity in this logical block, we let autoTable handle pagination and just approximate 'yPos' isn't fully accurate if table spans pages.
        // A safer way is accessing doc.lastAutoTable.finalY
        // @ts-ignore
        yPos = doc.lastAutoTable.finalY + 10;
      } else {
        yPos += 5;
      }
    });

    doc.save('Relatorio_GTFS.pdf');
  };

  const reset = () => {
    setResults(null);
    setFileName('');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/ALSA_2019_logo.svg/374px-ALSA_2019_logo.svg.png" alt="Logo" className="h-8" />
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Validação GTFS</h1>
                </div>
            </div>
            {results && (
                <div className="flex gap-2">
                    <button 
                        onClick={reset}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                    >
                        <RotateCcw className="w-4 h-4" /> Novo
                    </button>
                    <button 
                        onClick={downloadPDF}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 shadow-sm"
                    >
                        <Download className="w-4 h-4" /> PDF
                    </button>
                </div>
            )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {!results && !loading && (
            <div className="text-center">
                <div className="bg-white p-10 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-2xl font-bold mb-4 text-slate-800">Verificador de Integridade GTFS</h2>
                    <p className="text-slate-500 mb-8 max-w-lg mx-auto">
                        Carregue o seu ficheiro GTFS (zip) para executar automaticamente as regras de validação da Alsa Todi.
                        O processamento é feito localmente no seu navegador.
                    </p>
                    <FileUpload onFileSelect={processFile} isLoading={loading} />
                </div>
            </div>
        )}

        {loading && (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-lg font-medium text-slate-600">A processar ficheiros...</p>
                <p className="text-sm text-slate-400">Isto pode demorar alguns segundos dependendo do tamanho do feed.</p>
            </div>
        )}

        {results && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold">Resultados da Validação</h2>
                        <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                            <FileText className="w-4 h-4" /> {fileName} • {generationTime}
                        </p>
                    </div>
                </div>
                <ValidationReport results={results} />
            </div>
        )}
      </main>
    </div>
  );
};

export default App;