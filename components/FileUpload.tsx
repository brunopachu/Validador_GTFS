import React from 'react';
import { Upload } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isLoading }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors">
      <Upload className="w-12 h-12 text-gray-400 mb-4" />
      <p className="mb-2 text-lg font-semibold text-gray-700">Carregar ficheiro GTFS (.zip)</p>
      <p className="text-sm text-gray-500 mb-6">Selecione o arquivo .zip contendo os ficheiros .txt</p>
      
      <label className={`
        px-6 py-2 rounded bg-blue-600 text-white font-medium cursor-pointer hover:bg-blue-700 transition
        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
      `}>
        {isLoading ? 'A processar...' : 'Selecionar Arquivo'}
        <input 
          type="file" 
          accept=".zip" 
          className="hidden" 
          onChange={handleFileChange}
          disabled={isLoading}
        />
      </label>
    </div>
  );
};
