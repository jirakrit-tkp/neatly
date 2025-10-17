import { useState, useEffect, useCallback } from "react";
import Layout from "@/components/admin/Layout";
import { ButtonShadcn as Button } from "@/components/ui/button-shadcn";
import { Input } from "@/components/ui/input";
import { FileQuestionMark } from "lucide-react";
import SuggestionMenu from "@/components/admin/SuggestionMenu";
import { Reorder } from "motion/react";
import { supabase } from "@/lib/supabaseClient";

type RoomTypePayload = {
  rooms: string[];
  buttonName: string;
};

type OptionDetail = {
  option: string;
  detail: string;
};

type OptionDetailsPayload = OptionDetail[];

type ReplyPayload = null | RoomTypePayload | OptionDetailsPayload;

interface FAQ {
  id: string;
  topic: string;
  reply_message: string;
  reply_format?: 'message' | 'room_type' | 'option_details';
  reply_payload?: ReplyPayload;
  created_at: string;
  updated_at: string;
  aliases?: Array<{ id: string; alias: string }>;
}

interface Context {
  id: string;
  content: string;
  created_at: string;
  created_by?: string;
}

export default function ChatbotAdmin() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(false);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);

  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);
  const [showCreateFAQ, setShowCreateFAQ] = useState<boolean>(false);

  // Snackbar states
  const [snackbar, setSnackbar] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'delete';
  }>({ show: false, message: '', type: 'success' });

  // Greeting and Fallback states
  const [greetingMessage, setGreetingMessage] = useState("");
  const [fallbackMessage, setFallbackMessage] = useState("");
  const [isEditingGreeting, setIsEditingGreeting] = useState(false);
  const [isEditingFallback, setIsEditingFallback] = useState(false);

  // Context states
  const [contexts, setContexts] = useState<Context[]>([]);
  const [newContext, setNewContext] = useState({ content: "" });
  const [editingContext, setEditingContext] = useState<Context | null>(null);

  // Snackbar functions
  const showSnackbar = (message: string, type: 'success' | 'error' | 'delete') => {
    setSnackbar({ show: true, message, type });
    setTimeout(() => {
      setSnackbar(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  // Validation error states
  const [validationErrors, setValidationErrors] = useState<{
    greeting?: string;
    fallback?: string;
    context?: string;
  }>({});

  // Separate validation for editing contexts
  const [editingContextErrors, setEditingContextErrors] = useState<{ [id: string]: string | undefined }>({});

  // Get admin user ID
  useEffect(() => {
    const getAdminUser = async () => {
      console.log("🔍 Debug: Getting admin user session...");
      try {
        const { data, error } = await supabase.auth.getSession();
        console.log("🔍 Debug: getSession response:", { data, error });
        
        if (error) {
          console.log("❌ Debug: getSession error:", error);
          return;
        }
        
        const session = data?.session;
        console.log("🔍 Debug: Session data:", session);
        
        if (session?.user?.id) {
          console.log("🔍 Debug: Setting adminUserId to:", session.user.id);
          setAdminUserId(session.user.id);
        } else {
          console.log("❌ Debug: No session or user ID found");
          console.log("❌ Debug: session:", session);
          console.log("❌ Debug: session?.user:", session?.user);
        }
      } catch (err) {
        console.log("❌ Debug: getSession exception:", err);
      }
    };
    getAdminUser();
  }, []);

  // Load FAQs and Contexts on component mount
  useEffect(() => {
    fetchFAQs();
    fetchContexts();
  }, []);

  const fetchFAQs = async () => {
    try {
      const response = await fetch("/api/chat/faqs");
      const data = await response.json();
      const faqsData = data.faqs || [];

      // หา greeting และ fallback messages
      const greetingFaq = faqsData.find(
        (faq: FAQ) => faq.topic === "::greeting::"
      );
      const fallbackFaq = faqsData.find(
        (faq: FAQ) => faq.topic === "::fallback::"
      );

      if (greetingFaq) {
        setGreetingMessage(greetingFaq.reply_message);
      }
      if (fallbackFaq) {
        setFallbackMessage(fallbackFaq.reply_message);
      }

      // ดึง aliases สำหรับแต่ละ FAQ
      const faqsWithAliases = await Promise.all(
        faqsData.map(async (faq: FAQ) => {
          try {
            const aliasesResponse = await fetch(
              `/api/chat/aliases?faq_id=${faq.id}`
            );
            const aliasesData = await aliasesResponse.json();
            return { ...faq, aliases: aliasesData.aliases || [] };
          } catch (error) {
            console.error("Error fetching aliases for FAQ:", faq.id, error);
            return { ...faq, aliases: [] };
          }
        })
      );

      setFaqs(faqsWithAliases);
    } catch (error) {
      console.error("Error fetching FAQs:", error);
    }
  };

  const handleUpdateFAQ = async () => {
    if (
      !editingFAQ ||
      !editingFAQ.topic.trim() ||
      !editingFAQ.reply_message.trim()
    ) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/chat/faqs?id=${editingFAQ.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: editingFAQ.topic,
          reply_message: editingFAQ.reply_message,
          reply_format: editingFAQ.reply_format || 'message',
          reply_payload: editingFAQ.reply_payload || null,
        }),
      });

      if (response.ok) {
        console.log("FAQ updated with ID:", editingFAQ.id);
        setEditingFAQ(null);
        fetchFAQs();
        showSnackbar("Suggestion updated successfully", "success");
      } else {
      }
    } catch (error) {
      console.error("Error updating FAQ:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFAQ = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/chat/faqs?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchFAQs();
        showSnackbar("Suggestion deleted successfully", "delete");
      } else {
        showSnackbar("Failed to delete suggestion", "error");
      }
    } catch (error) {
      console.error("Error deleting FAQ:", error);
      showSnackbar("Error deleting suggestion", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAlias = async (aliasId: string) => {
    try {
      await fetch(`/api/chat/aliases?id=${aliasId}`, {
        method: "DELETE",
      });
      fetchFAQs();
    } catch (error) {
      console.error("Error deleting alias:", error);
    }
  };

  const handleReorderFAQs = async (reorderedFAQs: FAQ[]) => {
    // 1) Update UI order immediately (AmenityItems-style)
    const specials = faqs.filter(
      (f) => f.topic === "::greeting::" || f.topic === "::fallback::"
    );
    setFaqs([...reorderedFAQs, ...specials]);

    // 2) Persist display_order to server in background
    try {
      // Send updates sequentially to avoid unique constraint conflicts
      for (let i = 0; i < reorderedFAQs.length; i++) {
        const faq = reorderedFAQs[i];
        await fetch(`/api/chat/faqs?id=${faq.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: faq.topic,
            reply_message: faq.reply_message,
            reply_format: faq.reply_format || 'message',
            reply_payload: faq.reply_payload || null,
            display_order: i,
          }),
        });
      }
      console.log("✅ Display order updated successfully");
    } catch (error) {
      console.error("❌ Error updating display order:", error);
    }
  };

  const handleSaveGreeting = async () => {
    // Clear previous validation errors
    setValidationErrors(prev => ({ ...prev, greeting: undefined }));

    // Validation
    if (!greetingMessage.trim()) {
      setValidationErrors(prev => ({ ...prev, greeting: "Please enter a greeting message" }));
      return;
    }

    setLoading(true);
    try {
      // หา greeting message ที่มีอยู่
      const existingGreeting = faqs.find(
        (faq) => faq.topic === "::greeting::"
      );

      const response = await fetch(
        `/api/chat/faqs${existingGreeting ? `?id=${existingGreeting.id}` : ""}`,
        {
          method: existingGreeting ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: "::greeting::",
            reply_message: greetingMessage,
            reply_format: 'message',
            reply_payload: null,
          }),
        }
      );

      if (response.ok) {
        setIsEditingGreeting(false);
        fetchFAQs();
        showSnackbar("Greeting message saved successfully", "success");
      } else {
      }
    } catch (error) {
      console.error("Error saving greeting:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFallback = async () => {
    // Clear previous validation errors
    setValidationErrors(prev => ({ ...prev, fallback: undefined }));

    // Validation
    if (!fallbackMessage.trim()) {
      setValidationErrors(prev => ({ ...prev, fallback: "Please enter a fallback message" }));
      return;
    }

    setLoading(true);
    try {
      // หา fallback message ที่มีอยู่
      const existingFallback = faqs.find(
        (faq) => faq.topic === "::fallback::"
      );

      const response = await fetch(
        `/api/chat/faqs${existingFallback ? `?id=${existingFallback.id}` : ""}`,
        {
          method: existingFallback ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: "::fallback::",
            reply_message: fallbackMessage,
            reply_format: 'message',
            reply_payload: null,
          }),
        }
      );

      if (response.ok) {
        setIsEditingFallback(false);
        fetchFAQs();
        showSnackbar("Fallback message saved successfully", "success");
      } else {
      }
    } catch (error) {
      console.error("Error saving fallback:", error);
    } finally {
      setLoading(false);
    }
  };

  // Context Management Functions
  const fetchContexts = async () => {
    try {
      const response = await fetch("/api/chat/contexts");
      const data = await response.json();
      setContexts(data.contexts || []);
    } catch (error) {
      console.error("Error fetching contexts:", error);
    }
  };

  const handleCreateContext = async () => {
    console.log("🟡 Admin: handleCreateContext called");

    // Check if adminUserId is available
    if (!adminUserId) {
      console.log("❌ Admin: adminUserId not available yet");
      setValidationErrors(prev => ({ ...prev, context: "Please wait, loading admin information..." }));
      return;
    }

    // Clear previous validation errors
    setValidationErrors(prev => ({ ...prev, context: undefined }));

    // Validation
    if (!newContext.content.trim()) {
      setValidationErrors(prev => ({ ...prev, context: "Please enter a detail" }));
      return;
    }

    // Split by comma and create multiple contexts
    const details = newContext.content.split(',').map(detail => detail.trim()).filter(detail => detail.length > 0);
    
    if (details.length === 0) {
      setValidationErrors(prev => ({ ...prev, context: "Please enter at least one detail" }));
      return;
    }

    // Check for duplicates with existing contexts
    const existingContexts = contexts.map(ctx => ctx.content.toLowerCase());
    const duplicateDetails = details.filter(detail => existingContexts.includes(detail.toLowerCase()));
    
    if (duplicateDetails.length > 0) {
      setValidationErrors(prev => ({ 
        ...prev, 
        context: `Duplicate details found: ${duplicateDetails.join(', ')}` 
      }));
      return;
    }

    // Check for duplicates within the input itself
    const uniqueDetails = [...new Set(details.map(detail => detail.toLowerCase()))];
    if (uniqueDetails.length !== details.length) {
      setValidationErrors(prev => ({ 
        ...prev, 
        context: "Duplicate details found in your input" 
      }));
      return;
    }

    console.log(
      "🟡 Admin: Starting context creation with details:",
      details
    );
    setLoading(true);
    try {
      // Create multiple contexts with created_by
      console.log("🔍 Debug: adminUserId =", adminUserId);
      console.log("🔍 Debug: adminUserId type =", typeof adminUserId);
      console.log("🔍 Debug: adminUserId is null?", adminUserId === null);
      console.log("🔍 Debug: adminUserId is undefined?", adminUserId === undefined);
      
      const promises = details.map(detail => {
        const payload = { 
          content: detail,
          created_by: adminUserId 
        };
        console.log("🔍 Debug: Sending payload:", payload);
        console.log("🔍 Debug: Payload created_by type =", typeof payload.created_by);
        return fetch("/api/chat/contexts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      });

      const responses = await Promise.all(promises);
      const allSuccessful = responses.every(response => response.ok);

      if (allSuccessful) {
        console.log("✅ Admin: All contexts created successfully");
        setNewContext({ content: "" });
        fetchContexts();
        showSnackbar("Details added successfully", "success");
      } else {
        console.error("❌ Admin: Some contexts failed to create");
        setValidationErrors(prev => ({ ...prev, context: "Some details failed to save" }));
        showSnackbar("Failed to add details", "error");
      }
    } catch (error) {
      console.error("❌ Admin: Error creating contexts:", error);
      showSnackbar("Error adding details", "error");
      setValidationErrors(prev => ({ ...prev, context: "Error creating details" }));
    } finally {
      console.log("🟡 Admin: Setting loading to false");
      setLoading(false);
    }
  };

  const handleUpdateContext = async () => {
    if (!editingContext) return;

    // Clear previous validation errors for this specific context
    setEditingContextErrors(prev => ({ ...prev, [editingContext.id]: undefined }));

    // Validation
    if (!editingContext.content.trim()) {
      setEditingContextErrors(prev => ({ ...prev, [editingContext.id]: "Please enter a detail" }));
      return;
    }

    // Check for duplicates with existing contexts (excluding current one)
    const existingContexts = contexts
      .filter(ctx => ctx.id !== editingContext.id)
      .map(ctx => ctx.content.toLowerCase());
    
    if (existingContexts.includes(editingContext.content.toLowerCase())) {
      setEditingContextErrors(prev => ({ 
        ...prev, 
        [editingContext.id]: "This detail already exists" 
      }));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/chat/contexts?id=${editingContext.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: editingContext.content,
            updated_by: adminUserId,
          }),
        }
      );

      if (response.ok) {
        setEditingContext(null);
        fetchContexts();
        showSnackbar("Details updated successfully", "success");
      } else {
        showSnackbar("Failed to update details", "error");
      }
    } catch (error) {
      console.error("Error updating context:", error);
      showSnackbar("Error updating details", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContext = async (id: string) => {
    try {
      const response = await fetch(`/api/chat/contexts?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchContexts();
        showSnackbar("Details deleted successfully", "delete");
      } else {
        showSnackbar("Failed to delete details", "error");
      }
    } catch (error) {
      console.error("Error deleting context:", error);
      showSnackbar("Error deleting details", "error");
    }
  };

  return (
    <Layout>
      <div className="bg-gray-100 flex-1" style={{ minHeight: "100vh" }}>
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="w-full px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Chatbot Setup</h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="w-full px-6 py-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            {/* Default Chatbot Messages */}
            <div>
              <h2 className="text-lg font-semibold text-gray-600 mb-4">
                Default Chatbot Messages
              </h2>

              {/* Greeting Message */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Greeting Message
                </label>
                <div className="space-y-2">
                  <div className="relative">
                    <textarea
                      value={greetingMessage}
                      onChange={(e) => {
                        setGreetingMessage(e.target.value);
                        // Clear error when user starts typing
                        if (validationErrors.greeting) {
                          setValidationErrors(prev => ({ ...prev, greeting: undefined }));
                        }
                      }}
                      placeholder="Enter greeting message..."
                      className={`w-full p-3 border rounded-md h-24 resize-none outline-none ${
                        isEditingGreeting
                          ? validationErrors.greeting
                            ? "border-[var(--color-red)] focus:ring-[var(--color-red)] focus:border-[var(--color-red)] text-black"
                            : "border-gray-300 hover:border-orange-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-black"
                          : "text-gray-500 border-gray-300"
                      }`}
                      disabled={!isEditingGreeting}
                    />
                    {isEditingGreeting && validationErrors.greeting && (
                      <img 
                        src="/icons/exclamation-icon.svg" 
                        alt="Error" 
                        className="absolute right-3 top-3 w-4 h-4" 
                      />
                    )}
                  </div>
                  {isEditingGreeting && validationErrors.greeting && (
                    <div className="mt-1 text-[var(--color-red)] text-xs">
                      {validationErrors.greeting}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveGreeting}
                      disabled={loading || !isEditingGreeting}
                      className={`cursor-pointer ${
                        isEditingGreeting
                          ? "bg-orange-500 hover:bg-orange-600 text-white"
                          : "bg-gray-300 cursor-not-allowed text-gray-600"
                      }`}
                    >
                      {loading ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      onClick={
                        isEditingGreeting
                          ? () => {
                              // Reset to original value
                              const originalGreeting = faqs.find(faq => faq.topic === "::greeting::");
                              setGreetingMessage(originalGreeting?.reply_message || "");
                              setIsEditingGreeting(false);
                              // Clear validation errors
                              setValidationErrors(prev => ({ ...prev, greeting: undefined }));
                            }
                          : () => setIsEditingGreeting(true)
                      }
                      variant="outline"
                      className="cursor-pointer border-orange-500 text-orange-500 hover:bg-orange-50"
                    >
                      {isEditingGreeting ? "Cancel" : "Edit"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Fallback Message */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Fallback Message
                </label>
                <div className="space-y-2">
                  <div className="relative">
                    <textarea
                      value={fallbackMessage}
                      onChange={(e) => {
                        setFallbackMessage(e.target.value);
                        // Clear error when user starts typing
                        if (validationErrors.fallback) {
                          setValidationErrors(prev => ({ ...prev, fallback: undefined }));
                        }
                      }}
                      placeholder="Enter fallback message..."
                      className={`w-full p-3 border rounded-md h-24 resize-none outline-none ${
                        isEditingFallback
                          ? validationErrors.fallback
                            ? "border-[var(--color-red)] focus:ring-[var(--color-red)] focus:border-[var(--color-red)] text-black"
                            : "border-gray-300 hover:border-orange-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-black"
                          : "text-gray-500 border-gray-300"
                      }`}
                      disabled={!isEditingFallback}
                    />
                    {isEditingFallback && validationErrors.fallback && (
                      <img 
                        src="/icons/exclamation-icon.svg" 
                        alt="Error" 
                        className="absolute right-3 top-3 w-4 h-4" 
                      />
                    )}
                  </div>
                  {isEditingFallback && validationErrors.fallback && (
                    <div className="mt-1 text-[var(--color-red)] text-xs">
                      {validationErrors.fallback}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveFallback}
                      disabled={loading || !isEditingFallback}
                      className={`cursor-pointer ${
                        isEditingFallback
                          ? "bg-orange-500 hover:bg-orange-600 text-white"
                          : "bg-gray-300 cursor-not-allowed text-gray-600"
                      }`}
                    >
                      {loading ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      onClick={
                        isEditingFallback
                          ? () => {
                              // Reset to original value
                              const originalFallback = faqs.find(faq => faq.topic === "::fallback::");
                              setFallbackMessage(originalFallback?.reply_message || "");
                              setIsEditingFallback(false);
                              // Clear validation errors
                              setValidationErrors(prev => ({ ...prev, fallback: undefined }));
                            }
                          : () => setIsEditingFallback(true)
                      }
                      variant="outline"
                      className="cursor-pointer border-orange-500 text-orange-500 hover:bg-orange-50"
                    >
                      {isEditingFallback ? "Cancel" : "Edit"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Thick Gray Divider */}
            <div className="border-t-4 border-gray-300 mt-10 mb-15"></div>

            {/* Context Management Section */}
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-600 mb-4">
                Helpful Details
              </h2>

              {/* Create New Context */}
              <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-100">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Detail
                    </label>
                    <div className="relative">
                      <textarea
                        value={newContext.content}
                        onChange={(e) => {
                          setNewContext({
                            ...newContext,
                            content: e.target.value,
                          });
                          // Clear error when user starts typing
                          if (validationErrors.context) {
                            setValidationErrors(prev => ({ ...prev, context: undefined }));
                          }
                        }}
                        placeholder="Enter detail (separate multiple details with commas)..."
                        className={`w-full bg-white p-3 border rounded-md resize-none outline-none ${
                          validationErrors.context
                            ? "border-[var(--color-red)] focus:ring-[var(--color-red)] focus:border-[var(--color-red)]"
                            : "border-gray-300 hover:border-orange-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        }`}
                      />
                      {validationErrors.context && (
                        <img 
                          src="/icons/exclamation-icon.svg" 
                          alt="Error" 
                          className="absolute right-3 top-3 w-4 h-4" 
                        />
                      )}
                    </div>
                    {validationErrors.context && (
                      <div className="mt-1 text-[var(--color-red)] text-xs">
                        {validationErrors.context}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCreateContext}
                      disabled={loading}
                      className="bg-orange-500 text-white hover:bg-orange-600 disabled:bg-gray-300 disabled:text-gray-600 cursor-pointer"
                    >
                      {loading ? "Adding..." : "Add"}
                    </Button>
                    <Button
                      onClick={() => setNewContext({ content: "" })}
                      disabled={loading}
                      variant="ghost"
                      className="cursor-pointer bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>

              {/* Context List */}
              <div className="space-y-2">
                {/* <h3 className="text-md font-medium text-gray-900">
                  Existing Details ({contexts.length})
                </h3> */}
                {contexts.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {contexts.map((context) => (
                      <div key={context.id} className="flex flex-col">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded border border-gray-200">
                          {editingContext?.id === context.id ? (
                            // Edit Mode
                            <div className="flex items-center gap-2">
                              <textarea
                                value={editingContext.content}
                                onChange={(e) => {
                                  setEditingContext({
                                    ...editingContext,
                                    content: e.target.value,
                                  });
                                  // Clear error when user starts typing
                                  if (editingContextErrors[editingContext.id]) {
                                    setEditingContextErrors(prev => ({ ...prev, [editingContext.id]: undefined }));
                                  }
                                }}
                                placeholder="Enter detail (separate multiple details with commas)..."
                                className={`min-w-[200px] bg-white p-1 border rounded text-sm resize-none outline-none ${
                                  editingContextErrors[editingContext.id]
                                    ? "border-[var(--color-red)]"
                                    : "border-gray-300"
                                }`}
                                rows={1}
                              />
                              <button
                                onClick={handleUpdateContext}
                                className="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingContext(null);
                                  // Clear error when canceling
                                  if (editingContext) {
                                    setEditingContextErrors(prev => ({ ...prev, [editingContext.id]: undefined }));
                                  }
                                }}
                                className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded hover:bg-gray-200 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            // View Mode
                            <>
                              <span
                                className="max-w-xs truncate"
                                title={context.content}
                              >
                                {context.content}
                              </span>
                              <div className="w-px h-4 bg-gray-300 mx-1"></div>
                              <button
                                onClick={() => setEditingContext(context)}
                                className="text-orange-500 hover:text-orange-700 cursor-pointer -mx-0.5"
                                title="Edit"
                              >
                                <img src="/pencil.svg" alt="Edit" className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDeleteContext(context.id)}
                                className="text-orange-500 hover:text-orange-700 cursor-pointer -mx-0.25"
                                title="Delete"
                              >
                                <img src="/delete.svg" alt="Delete" className="w-5 h-5" />
                              </button>
                            </>
                          )}
                        </span>
                        {editingContext && editingContext.id === context.id && editingContextErrors[editingContext.id] && (
                          <div className="mt-1 text-[var(--color-red)] text-xs">
                            {editingContextErrors[editingContext.id]}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <p>No contexts found. Create your first context above.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Thick Gray Divider */}
            <div className="border-t-4 border-gray-300 mt-10 mb-15"></div>

            {/* Suggestion Menu & Responses */}
            <div>
              <h2 className="text-lg font-semibold text-gray-600 mb-4">
                Suggestion Menu & Responses
              </h2>
              
              {/* Existing FAQs List (Read-only) */}
              <div className="space-y-10 mb-6">
                <Reorder.Group
                  axis="y"
                  values={faqs.filter(
                    (faq) =>
                      faq.topic !== "::greeting::" &&
                      faq.topic !== "::fallback::"
                  )}
                  onReorder={handleReorderFAQs}
                  className="space-y-10"
                >
                   {faqs
                     .filter(
                       (faq) =>
                         faq.topic !== "::greeting::" &&
                         faq.topic !== "::fallback::"
                     )
                     .map((faq) => (
                      <Reorder.Item key={faq.id} value={faq}>
                        <SuggestionMenu 
                          faqs={[faq]}
                          loading={loading}
                          onFetchFAQs={fetchFAQs}
                          onDeleteFAQ={handleDeleteFAQ}
                          onDeleteAlias={handleDeleteAlias}
                          onReorderFAQs={handleReorderFAQs}
                          isReadOnly={editingFAQ?.id !== faq.id}
                          faq={faq}
                          onEdit={() => {
                            setEditingFAQ(faq);
                          }}
                          onClose={() => setEditingFAQ(null)}
                          onShowSnackbar={showSnackbar}
                          adminUserId={adminUserId}
                        />
                      </Reorder.Item>
                    ))}
                </Reorder.Group>
                {faqs.filter(
                  (faq) =>
                    faq.topic !== "::greeting::" &&
                    faq.topic !== "::fallback::"
                ).length === 0 && (
                  <div className="p-6 text-center text-gray-500">
                    No suggestion menu yet
                  </div>
                )}
              </div>

              {/* Create FAQ Form (Only show when + Add Suggestion menu is clicked) */}
              {showCreateFAQ && (
                <SuggestionMenu 
                  faqs={faqs}
                  loading={loading}
                  onFetchFAQs={fetchFAQs}
                  onDeleteFAQ={handleDeleteFAQ}
                  onDeleteAlias={handleDeleteAlias}
                  onClose={() => setShowCreateFAQ(false)}
                  onShowSnackbar={showSnackbar}
                  adminUserId={adminUserId}
                />
              )}

              
              {!showCreateFAQ && (
                <div className="mt-4">
                  <Button
                    onClick={() => setShowCreateFAQ(true)}
                    variant="outline"
                    className="cursor-pointer border-orange-500 text-orange-500 hover:bg-orange-50"
                  >
                    + Add Suggestion menu
                  </Button>
                </div>
              )}
            </div>

          </div>

          {/* Bottom spacing */}
          <div className="h-8"></div>
        </div>


      </div>

      {/* Snackbar */}
      {snackbar.show && (
        <div className="fixed top-4 right-4 z-[9999] animate-in slide-in-from-right duration-300">
          <div className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
            snackbar.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
            snackbar.type === 'delete' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
            'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {snackbar.type === 'success' && <span className="text-green-600">✓</span>}
            {snackbar.type === 'delete' && <span className="text-orange-600">🗑️</span>}
            {snackbar.type === 'error' && <span className="text-red-600">✕</span>}
            <span className="font-medium">{snackbar.message}</span>
          </div>
        </div>
      )}
    </Layout>
  );
}