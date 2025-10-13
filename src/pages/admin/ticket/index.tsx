import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/admin/Layout";
import { ButtonShadcn as Button } from "@/components/ui/button-shadcn";
import { Input } from "@/components/ui/input";
import TicketActions from "@/components/admin/TicketActions";
import ChatbotConfirmModal from "@/components/admin/ui/ChatbotConfirmModal";
import ChatbotSnackbar from "@/components/admin/ui/ChatbotSnackbar";
import { toast } from "sonner";

interface Ticket {
  id: string;
  session_id: string;
  user_message: string;
  status: string;
  created_at: string;
  closed_at?: string;
}

export default function TicketAdmin() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  const [snackbar, setSnackbar] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'delete' }>({ show: false, message: '', type: 'success' });

  // Load tickets on component mount
  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/ticket/tickets");
      const data = await response.json();
      setTickets(data.tickets || []);
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter tickets based on status and search term
  const filteredTickets = tickets.filter((ticket) => {
    let matchesStatus = false;
    if (filterStatus === "all") {
      matchesStatus = true;
    } else if (filterStatus === "solved") {
      matchesStatus = ticket.status === "solved";
    } else {
      matchesStatus = ticket.status === filterStatus;
    }

    const matchesSearch =
      searchTerm === "" ||
      ticket.user_message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.session_id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-orange-200 text-orange-800";
      case "in_progress":
        return "bg-green-300 text-green-800";
      case "solved":
        return "bg-gray-200 text-gray-800";
      default:
        return "bg-gray-200 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "open":
        return "Pending";
      case "in_progress":
        return "Accepted";
      case "solved":
        return "Solved";
      default:
        return status;
    }
  };

  return (
    <Layout>
      <div className="bg-gray-100 flex-1" style={{ minHeight: "100vh" }}>
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="w-full px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Support Tickets
            </h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="w-full px-6 py-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            {/* Filters and Search */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                {/* Search */}
                <div className="flex-1">
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by message or session ID..."
                    className="w-full hover:border-orange-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                {/* Status Filter */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => setFilterStatus("all")}
                    variant={filterStatus === "all" ? undefined : "outline"}
                    className={`cursor-pointer ${
                      filterStatus === "all"
                        ? "bg-orange-500 text-white hover:bg-orange-600"
                        : "border-orange-500 text-orange-500 hover:bg-orange-50"
                    }`}
                  >
                    All ({tickets.length})
                  </Button>
                  <Button
                    onClick={() => setFilterStatus("open")}
                    variant={filterStatus === "open" ? undefined : "outline"}
                    className={`cursor-pointer ${
                      filterStatus === "open"
                        ? "bg-orange-500 text-white hover:bg-orange-600"
                        : "border-orange-500 text-orange-500 hover:bg-orange-50"
                    }`}
                  >
                    Pending ({tickets.filter((t) => t.status === "open").length})
                  </Button>
                  <Button
                    onClick={() => setFilterStatus("in_progress")}
                    variant={filterStatus === "in_progress" ? undefined : "outline"}
                    className={`cursor-pointer ${
                      filterStatus === "in_progress"
                        ? "bg-orange-500 text-white hover:bg-orange-600"
                        : "border-orange-500 text-orange-500 hover:bg-orange-50"
                    }`}
                  >
                    Accepted (
                    {tickets.filter((t) => t.status === "in_progress").length})
                  </Button>
                  <Button
                    onClick={() => setFilterStatus("solved")}
                    variant={filterStatus === "solved" ? undefined : "outline"}
                    className={`cursor-pointer ${
                      filterStatus === "solved"
                        ? "bg-orange-500 text-white hover:bg-orange-600"
                        : "border-orange-500 text-orange-500 hover:bg-orange-50"
                    }`}
                  >
                    Solved ({tickets.filter((t) => t.status === "solved").length}
                    )
                  </Button>
                </div>
              </div>
            </div>

            {/* Tickets List */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-600 mb-4">
                Tickets ({filteredTickets.length})
              </h2>

              {loading ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Loading tickets...</p>
                </div>
              ) : filteredTickets.length > 0 ? (
                filteredTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-4 border border-gray-200 rounded-lg bg-gray-100 hover:shadow-md transition-shadow text-gray-700"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${getStatusColor(
                              ticket.status
                            )}`}
                          >
                            {getStatusText(ticket.status)}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <span className="text-gray-600">Session:</span>
                            <span className="font-mono bg-gray-200 text-gray-700 rounded px-2 py-0.5">
                              {ticket.session_id.substring(0, 8)}…
                            </span>
                            <button
                              onClick={() => navigator.clipboard.writeText(ticket.session_id)}
                              className="ml-1 text-gray-500 hover:text-gray-700 cursor-pointer"
                              title="Copy full session id"
                            >
                              ⧉
                            </button>
                          </span>
                        </div>

                        <h4 className="text-gray-800 mb-2">
                          {ticket.user_message.length > 100
                            ? `${ticket.user_message.substring(0, 100)}...`
                            : ticket.user_message}
                        </h4>

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span title={new Date(ticket.created_at).toISOString()}>
                            <span className="text-gray-600">Created:</span>{" "}
                            <span className="text-gray-700">{new Date(ticket.created_at).toLocaleString("en-US")}</span>
                          </span>
                          {ticket.closed_at && (
                            <span title={new Date(ticket.closed_at).toISOString()}>
                              <span className="text-gray-600">Closed:</span>{" "}
                              <span className="text-gray-700">{new Date(ticket.closed_at).toLocaleString("en-US")}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                          <TicketActions
                          ticketId={ticket.id}
                          status={ticket.status}
                          onStatusUpdate={(newStatus) => {
                            setTickets((prev) =>
                              prev.map((t) =>
                                t.id === ticket.id
                                  ? { ...t, status: newStatus }
                                  : t
                              )
                            );
                              setSnackbar({ show: true, message: newStatus === 'in_progress' ? 'Ticket accepted' : 'Ticket solved', type: 'success' });
                              setTimeout(() => setSnackbar(prev => ({ ...prev, show: false })), 3000);
                          }}
                          onTicketDelete={() => {
                              setConfirmOpen(true);
                              setTicketToDelete(ticket);
                          }}
                          variant="list"
                          showViewDetail={true}
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-gray-500">
                  No tickets found
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom spacing */}
        <div className="h-8"></div>
      </div>
      <ChatbotSnackbar show={snackbar.show} message={snackbar.message} type={snackbar.type} />
      <ChatbotConfirmModal
        open={confirmOpen}
        title="Delete Ticket?"
        message={ticketToDelete ? `Are you sure you want to delete this ticket: "${ticketToDelete.user_message}" ?` : ''}
        confirmText="Yes, delete"
        cancelText={"Cancel"}
        onConfirm={async () => {
          if (!ticketToDelete) return;
          try {
            const res = await fetch(`/api/ticket/tickets?id=${ticketToDelete.id}`, { method: 'DELETE' });
            if (res.ok) {
              setTickets(prev => prev.filter(t => t.id !== ticketToDelete.id));
              setSnackbar({ show: true, message: 'Ticket deleted', type: 'delete' });
              setTimeout(() => setSnackbar(prev => ({ ...prev, show: false })), 3000);
            } else {
              setSnackbar({ show: true, message: 'Failed to delete ticket', type: 'error' });
              setTimeout(() => setSnackbar(prev => ({ ...prev, show: false })), 3000);
            }
          } catch (e) {
            setSnackbar({ show: true, message: 'Error deleting ticket', type: 'error' });
            setTimeout(() => setSnackbar(prev => ({ ...prev, show: false })), 3000);
          } finally {
            setConfirmOpen(false);
            setTicketToDelete(null);
          }
        }}
        onClose={() => {
          setConfirmOpen(false);
          setTicketToDelete(null);
        }}
      />
    </Layout>
  );
}
