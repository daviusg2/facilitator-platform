import { useState } from "react";
import ResponseManager from "./ResponseManager";

interface QuestionDTO {
  _id: string;
  order: number;
  promptText: string;
  isActive: boolean;
}

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

interface QuestionCardProps {
  question: QuestionDTO;
  responses: ResponseDTO[];
  isToggling?: boolean;
  isUpdating?: boolean;
  isDeleting?: boolean;
  onToggle: (question: QuestionDTO) => void;
  onUpdate: (questionId: string, updates: Partial<QuestionDTO>) => void;
  onDelete: (questionId: string) => void;
  onUpdateResponse?: (responseId: string, updates: Partial<ResponseDTO>) => void;
  onDeleteResponse?: (responseId: string) => void;
}

export default function QuestionCard({
  question,
  responses,
  isToggling = false,
  isUpdating = false,
  isDeleting = false,
  onToggle,
  onUpdate,
  onDelete,
  onUpdateResponse,
  onDeleteResponse
}: QuestionCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(question.promptText);
  const [showResponses, setShowResponses] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSaveEdit = () => {
    if (editText.trim() && editText !== question.promptText) {
      onUpdate(question._id, { promptText: editText.trim() });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(question.promptText);
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete(question._id);
    setShowDeleteConfirm(false);
  };

  // Stats about responses
  const responseStats = {
    total: responses.length,
    visible: responses.filter(r => !r.isHidden).length,
    hidden: responses.filter(r => r.isHidden).length,
    flagged: responses.filter(r => r.isFlagged).length,
    pinned: responses.filter(r => r.isPinned).length,
  };

  return (
    <div className="border rounded-lg bg-white shadow-sm">
      {/* Question Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full border rounded p-2 text-lg font-medium resize-none"
                  rows={2}
                  disabled={isUpdating}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEdit}
                    className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:bg-gray-400"
                    disabled={isUpdating || !editText.trim()}
                  >
                    {isUpdating ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="text-xs bg-gray-300 text-gray-700 px-3 py-1 rounded hover:bg-gray-400"
                    disabled={isUpdating}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="font-medium text-lg flex items-center gap-2">
                  <span className="text-gray-500 text-base">{question.order}.</span>
                  {question.promptText}
                </h3>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                    question.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {question.isActive ? 'LIVE' : 'DRAFT'}
                  </span>
                  
                  {/* Response stats */}
                  <span className="text-xs text-gray-500">
                    {responseStats.visible}/{responseStats.total} visible
                  </span>
                  
                  {responseStats.pinned > 0 && (
                    <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                      {responseStats.pinned} pinned
                    </span>
                  )}
                  
                  {responseStats.flagged > 0 && (
                    <span className="text-xs text-red-700 bg-red-100 px-2 py-1 rounded">
                      {responseStats.flagged} flagged
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          {!isEditing && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                title="Edit question"
                disabled={isUpdating || isDeleting}
              >
                <span className="text-sm">✏️</span>
              </button>
              
              <button
                onClick={() => onToggle(question)}
                className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded transition-colors ${
                  question.isActive
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-green-600 text-white hover:bg-green-700"
                } disabled:bg-gray-400`}
                disabled={isToggling || isDeleting}
              >
                {isToggling ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : question.isActive ? (
                  <>
                    <span>⏸️</span>
                    Close
                  </>
                ) : (
                  <>
                    <span>▶️</span>
                    Open
                  </>
                )}
              </button>
              
              {showDeleteConfirm ? (
                <div className="flex gap-1">
                  <button
                    onClick={handleDelete}
                    className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="text-xs bg-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-400"
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                  title="Delete question"
                  disabled={isUpdating || isDeleting}
                >
                  <span className="text-sm">🗑️</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Responses Section */}
      <div className="border-t border-gray-100">
        {/* Collapsible Response Header */}
        <button
          onClick={() => setShowResponses(!showResponses)}
          className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-gray-500">
              {showResponses ? '🔽' : '▶️'}
            </span>
            <span className="text-sm font-medium text-gray-700">
              Responses ({responseStats.total})
            </span>
          </div>
          
          {!showResponses && responseStats.total > 0 && (
            <div className="text-xs text-gray-500">
              {responseStats.visible} visible, {responseStats.flagged} flagged, {responseStats.pinned} pinned
            </div>
          )}
        </button>

        {/* Response Manager */}
        {showResponses && (
          <div className="p-4 pt-0">
            <ResponseManager
              questionId={question._id}
              responses={responses}
              onUpdateResponse={(responseId, updates) => {
                if (onUpdateResponse) {
                  onUpdateResponse(responseId, updates);
                }
              }}
              onDeleteResponse={(responseId) => {
                if (onDeleteResponse) {
                  onDeleteResponse(responseId);
                }
              }}
              isUpdating={isUpdating}
            />
          </div>
        )}
      </div>
    </div>
  );
}