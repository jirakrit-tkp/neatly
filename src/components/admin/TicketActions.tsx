import { ButtonShadcn as Button } from "@/components/ui/button-shadcn";
import { useRouter } from "next/router";
import { Eye, Trash } from "lucide-react";

interface TicketActionsProps {
  ticketId: string;
  status: string;
  onStatusUpdate?: (newStatus: string) => void;
  onTicketDelete?: () => void;
  variant?: 'list' | 'detail';
  showViewDetail?: boolean;
  onViewDetail?: () => void;
  hideDelete?: boolean;
  adminUserId?: string | null;
}

export default function TicketActions({
  ticketId,
  status,
  onStatusUpdate,
  onTicketDelete,
  variant = 'list',
  showViewDetail = true,
  onViewDetail,
  hideDelete = false,
  adminUserId
}: TicketActionsProps) {
  const router = useRouter();

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      // Prepare update data
      const updateData: { status: string; agent_id?: string } = { status: newStatus };
      
      // If accepting ticket (changing to in_progress), add agent_id
      if (newStatus === 'in_progress' && adminUserId) {
        updateData.agent_id = adminUserId;
      }

      const response = await fetch(`/api/ticket/tickets?id=${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        onStatusUpdate?.(newStatus);
        console.log(`✅ Ticket ${newStatus}${newStatus === 'in_progress' ? ` by agent ${adminUserId}` : ''}`);
      }
    } catch (error) {
      console.error(`Error updating ticket to ${newStatus}:`, error);
    }
  };

  // Delegate deletion to parent which opens confirmation modal
  const handleDeleteTicket = () => onTicketDelete?.();

  const handleViewDetail = () => {
    if (onViewDetail) return onViewDetail();
    router.push(`/admin/ticket/${ticketId}`);
  };

  const buttonSize = variant === 'list' ? 'sm' : undefined;
  const buttonClassName = variant === 'list' 
    ? 'cursor-pointer' 
    : 'px-4 py-2';

  return (
    <div className="flex items-center gap-4">
      {/* Left: Action buttons */}
      <div className="flex items-center gap-2">
        {status === 'open' && (
          <Button
            onClick={() => handleUpdateStatus('in_progress')}
            size={buttonSize}
            variant="outline"
            className={`border-orange-500 text-orange-500 hover:bg-orange-50 ${buttonClassName}`}
          >
            {variant === 'list' ? 'Accept' : 'Accept Ticket'}
          </Button>
        )}
        {status === 'in_progress' && (
          <Button
            onClick={() => handleUpdateStatus('solved')}
            size={buttonSize}
            className={`bg-orange-500 hover:bg-orange-600 text-white ${buttonClassName}`}
          >
            {variant === 'list' ? 'Solved' : 'Solve Ticket'}
          </Button>
        )}
      </div>

      {/* Divider - Hidden when hideDelete is true */}
      {!hideDelete && <div className="h-10 w-px bg-gray-300" />}

      {/* Right: Icon column */}
      <div className="flex flex-col items-center gap-2">
        {showViewDetail && variant === 'list' && (
          <button
            onClick={handleViewDetail}
            className="p-2 text-gray-600 hover:text-gray-800 cursor-pointer"
            title="View detail"
          >
            <Eye className="w-4 h-4" />
          </button>
        )}
        {!hideDelete && (
          <button
            onClick={status === 'solved' ? handleDeleteTicket : undefined}
            className={`p-2 ${
              status === 'solved'
                ? 'text-gray-600 hover:text-gray-800 cursor-pointer'
                : 'text-gray-400'
            }`}
            title={status === 'solved' ? 'Delete ticket' : 'Delete available after solved'}
            aria-disabled={status !== 'solved'}
            disabled={status !== 'solved'}
          >
            <Trash className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
