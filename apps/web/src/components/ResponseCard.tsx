import { useState } from "react";

interface ResponseDTO {
  _id: string;
  questionId: string;
  participantId?: string;
  bodyText: string;
  createdAt: string;
  isHidden?: boolean;
  isFlagged?: boolean;
  isPinned?: boolean;
}

interface ResponseCardProps {
  response: ResponseDTO;
  index: number;
  isSelected: boolean;
  onSelect: (responseId: string) => void;
  onToggleVisibility: (responseId: string, updates: Partial<ResponseDTO>) => void;
  onToggleFlag: (responseId: string, updates: Partial<ResponseDTO>) => void;
  onTogglePin: (responseId: string, updates: Partial<ResponseDTO>) => void;
  onDelete: (responseId: string) => void;
  isUpdating?: boolean;
}

export default function ResponseCard({
  response,
  index,
  isSelected,
  onSelect,
  onToggleVisibility,
  onToggleFlag,
  onTogglePin,
  onDelete,
  isUpdating = false
}: ResponseCardProps) {
  const [showActions, setShowActions] = useState(false);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div
      className={`
        relative border rounded-lg p-3 transition-all duration-200
        ${response.isHidden ? 'opacity-50 bg-gray-100' : 'bg-white'}
        ${response.isPinned ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'}
        ${response.isFlagged ? 'border-red-400 bg-red-50' : ''}
        ${isSelected ? 'ring-2 ring-blue-500' : ''}
        ${isUpdating ? 'animate-pulse' : ''}
        hover:shadow-sm
      `}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Selection checkbox */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(response._id)}
          className="mt-1 rounded"
        />
        
        <div className="flex-1 min-w-0">
          {/* Response content */}
          <p className={`text-sm ${response.isHidden ? 'line-through text-gray-500' : 'text-gray-900'}`}>
            {response.bodyText}
          </p>
          
          {/* Metadata */}
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
            <span>Response #{index + 1}</span>
            <span>•</span>
            <span>{formatTime(response.createdAt)}</span>
            {response.participantId && (
              <>
                <span>•</span>
                <span>ID: {response.participantId.slice(-6)}</span>
              </>
            )}
          </div>
          
          {/* Status badges */}
          <div className="flex items-center gap-1 mt-1">
            {response.isPinned && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                📌 Pinned
              </span>
            )}
            {response.isFlagged && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                🚩 Flagged
              </span>
            )}
            {response.isHidden && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                👁️‍🗨️ Hidden
              </span>
            )}
          </div>
        </div>
        
        {/* Action buttons */}
        <div className={`flex items-center gap-1 transition-opacity duration-200 ${
          showActions ? 'opacity-100' : 'opacity-0'
        }`}>
          <button
            onClick={() => onToggleVisibility(response._id, { isHidden: !response.isHidden })}
            className={`p-1 rounded hover:bg-gray-100 ${
              response.isHidden ? 'text-gray-600' : 'text-blue-600'
            }`}
            title={response.isHidden ? 'Show response' : 'Hide response'}
            disabled={isUpdating}
          >
            <span className="text-sm">
              {response.isHidden ? '👁️' : '👁️‍🗨️'}
            </span>
          </button>
          
          <button
            onClick={() => onToggleFlag(response._id, { isFlagged: !response.isFlagged })}
            className={`p-1 rounded hover:bg-gray-100 ${
              response.isFlagged ? 'text-red-600' : 'text-gray-400'
            }`}
            title={response.isFlagged ? 'Unflag response' : 'Flag response'}
            disabled={isUpdating}
          >
            <span className="text-sm">🚩</span>
          </button>
          
          <button
            onClick={() => onTogglePin(response._id, { isPinned: !response.isPinned })}
            className={`p-1 rounded hover:bg-gray-100 ${
              response.isPinned ? 'text-yellow-600' : 'text-gray-400'
            }`}
            title={response.isPinned ? 'Unpin response' : 'Pin response'}
            disabled={isUpdating}
          >
            <span className="text-sm">📌</span>
          </button>
          
          <button
            onClick={() => onDelete(response._id)}
            className="p-1 rounded hover:bg-gray-100 text-red-600"
            title="Delete response"
            disabled={isUpdating}
          >
            <span className="text-sm">🗑️</span>
          </button>
        </div>
      </div>
    </div>
  );
}