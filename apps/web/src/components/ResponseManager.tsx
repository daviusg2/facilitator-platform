import { useState } from "react";
import ResponseCard from "./ResponseCard";

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

interface ResponseManagerProps {
  questionId: string;
  responses: ResponseDTO[];
  onUpdateResponse: (responseId: string, updates: Partial<ResponseDTO>) => void;
  onDeleteResponse: (responseId: string) => void;
  isUpdating?: boolean;
}

type FilterType = 'all' | 'visible' | 'hidden' | 'flagged' | 'pinned';
type SortType = 'newest' | 'oldest' | 'pinned-first';

export default function ResponseManager({
  questionId,
  responses,
  onUpdateResponse,
  onDeleteResponse,
  isUpdating = false
}: ResponseManagerProps) {
  const [selectedResponses, setSelectedResponses] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('newest');
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Filter and sort responses
  const filteredAndSortedResponses = responses
    .filter(response => {
      switch (filter) {
        case 'visible': return !response.isHidden;
        case 'hidden': return response.isHidden;
        case 'flagged': return response.isFlagged;
        case 'pinned': return response.isPinned;
        default: return true;
      }
    })
    .sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'pinned-first':
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default: // newest
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  const handleSelectAll = () => {
    if (selectedResponses.size === filteredAndSortedResponses.length) {
      setSelectedResponses(new Set());
    } else {
      setSelectedResponses(new Set(filteredAndSortedResponses.map(r => r._id)));
    }
  };

  const handleSelectResponse = (responseId: string) => {
    const newSelected = new Set(selectedResponses);
    if (newSelected.has(responseId)) {
      newSelected.delete(responseId);
    } else {
      newSelected.add(responseId);
    }
    setSelectedResponses(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleBulkAction = (action: 'hide' | 'show' | 'flag' | 'unflag' | 'pin' | 'unpin' | 'delete') => {
    selectedResponses.forEach(responseId => {
      switch (action) {
        case 'hide':
          onUpdateResponse(responseId, { isHidden: true });
          break;
        case 'show':
          onUpdateResponse(responseId, { isHidden: false });
          break;
        case 'flag':
          onUpdateResponse(responseId, { isFlagged: true });
          break;
        case 'unflag':
          onUpdateResponse(responseId, { isFlagged: false });
          break;
        case 'pin':
          onUpdateResponse(responseId, { isPinned: true });
          break;
        case 'unpin':
          onUpdateResponse(responseId, { isPinned: false });
          break;
        case 'delete':
          onDeleteResponse(responseId);
          break;
      }
    });
    setSelectedResponses(new Set());
    setShowBulkActions(false);
  };

  if (responses.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm italic">No responses yet.</p>
        <p className="text-xs mt-1">Responses will appear here when participants submit them.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with stats and controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h4 className="font-medium text-sm text-gray-700">
            Responses ({responses.length})
          </h4>
          
          {/* Quick stats */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {responses.filter(r => r.isPinned).length > 0 && (
              <span className="flex items-center gap-1">
                <span>📌</span>
                {responses.filter(r => r.isPinned).length} pinned
              </span>
            )}
            {responses.filter(r => r.isFlagged).length > 0 && (
              <span className="flex items-center gap-1">
                <span>🚩</span>
                {responses.filter(r => r.isFlagged).length} flagged
              </span>
            )}
            {responses.filter(r => r.isHidden).length > 0 && (
              <span className="flex items-center gap-1">
                <span>👁️‍🗨️</span>
                {responses.filter(r => r.isHidden).length} hidden
              </span>
            )}
          </div>
        </div>

        {/* Filter and Sort Controls */}
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterType)}
            className="text-xs border rounded px-2 py-1"
          >
            <option value="all">All responses</option>
            <option value="visible">Visible only</option>
            <option value="hidden">Hidden only</option>
            <option value="flagged">Flagged only</option>
            <option value="pinned">Pinned only</option>
          </select>
          
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortType)}
            className="text-xs border rounded px-2 py-1"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="pinned-first">Pinned first</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-blue-600">✅</span>
              <span className="text-sm font-medium text-blue-900">
                {selectedResponses.size} response{selectedResponses.size === 1 ? '' : 's'} selected
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleBulkAction('hide')}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                disabled={isUpdating}
              >
                Hide
              </button>
              <button
                onClick={() => handleBulkAction('show')}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                disabled={isUpdating}
              >
                Show
              </button>
              <button
                onClick={() => handleBulkAction('flag')}
                className="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded"
                disabled={isUpdating}
              >
                Flag
              </button>
              <button
                onClick={() => handleBulkAction('pin')}
                className="text-xs px-2 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded"
                disabled={isUpdating}
              >
                Pin
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded"
                disabled={isUpdating}
              >
                Delete
              </button>
              <button
                onClick={() => {
                  setSelectedResponses(new Set());
                  setShowBulkActions(false);
                }}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded ml-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Select All Checkbox */}
      {filteredAndSortedResponses.length > 0 && (
        <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
          <input
            type="checkbox"
            checked={selectedResponses.size === filteredAndSortedResponses.length}
            onChange={handleSelectAll}
            className="rounded"
          />
          <label className="text-xs text-gray-600">
            Select all {filteredAndSortedResponses.length} responses
          </label>
        </div>
      )}

      {/* Responses List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredAndSortedResponses.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <span className="text-2xl opacity-50">🔍</span>
            <p className="text-sm mt-2">No responses match the current filter.</p>
          </div>
        ) : (
          filteredAndSortedResponses.map((response, index) => (
            <ResponseCard
              key={response._id}
              response={response}
              index={responses.findIndex(r => r._id === response._id)} // Original index
              isSelected={selectedResponses.has(response._id)}
              onSelect={handleSelectResponse}
              onToggleVisibility={(responseId, updates) => onUpdateResponse(responseId, updates)}
              onToggleFlag={(responseId, updates) => onUpdateResponse(responseId, updates)}
              onTogglePin={(responseId, updates) => onUpdateResponse(responseId, updates)}
              onDelete={onDeleteResponse}
              isUpdating={isUpdating}
            />
          ))
        )}
      </div>
    </div>
  );
}