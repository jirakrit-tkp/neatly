import { useState, useEffect, useCallback } from "react";
import { ButtonShadcn as Button } from "@/components/ui/button-shadcn";
import { Input } from "@/components/ui/input";
import { FileQuestionMark } from "lucide-react";
import { ChatbotDropdown } from "@/components/admin/ui/ChatbotDropdown";
import { Reorder, useDragControls } from "motion/react";
import ChatbotConfirmModal from "@/components/admin/ui/ChatbotConfirmModal";

// Types for reply payloads
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

interface SuggestionMenuProps {
  faqs: FAQ[];
  loading: boolean;
  onFetchFAQs: () => void;
  onDeleteFAQ: (id: string) => void;
  onDeleteAlias: (aliasId: string) => void;
  onReorderFAQs?: (faqs: FAQ[]) => void;
  isReadOnly?: boolean;
  faq?: FAQ;
  onClose?: () => void;
  onEdit?: () => void;
  onShowSnackbar?: (message: string, type: 'success' | 'error' | 'delete') => void;
}

export default function SuggestionMenu({ 
  faqs, 
  loading, 
  onFetchFAQs, 
  onDeleteFAQ, 
  onDeleteAlias,
  onReorderFAQs,
  isReadOnly = false,
  faq,
  onClose,
  onEdit,
  onShowSnackbar
}: SuggestionMenuProps) {
  // Base input styles
  const baseInputStyles = "w-full border !bg-white border-gray-300 rounded-md text-sm px-3 py-2";
  const readOnlyStyles = isReadOnly ? "text-gray-600 !bg-white !border-gray-300 !opacity-50" : "hover:border-orange-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 cursor-pointer";
  const errorStyles = "border-[var(--color-red)] focus:ring-[var(--color-red)] focus:border-[var(--color-red)]";
  
  const getInputClassName = (hasError: boolean) => {
    if (hasError) {
      return `${baseInputStyles} ${errorStyles}`;
    }
    return `${baseInputStyles} ${readOnlyStyles}`;
  };

  const getTextareaClassName = (hasError: boolean) => {
    const baseTextareaStyles = "w-full border !bg-white border-gray-300 rounded-md text-sm px-3 py-2 h-9 resize-none outline-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";
    if (hasError) {
      return `${baseTextareaStyles} ${errorStyles}`;
    }
    return `${baseTextareaStyles} ${readOnlyStyles}`;
  };

  // Helper component for error message
  const ErrorMessage = ({ message }: { message: string }) => (
    <div className="mt-1 text-[var(--color-red)] text-xs">
      <span>{message}</span>
    </div>
  );
  // Helper function to get format display string
  const getFormatDisplayString = (format?: string): string => {
    switch (format) {
      case 'message': return 'Message';
      case 'room_type': return 'Room type';
      case 'option_details': return 'Option with details';
      default: return 'Message';
    }
  };

  const [newFAQ, setNewFAQ] = useState({ 
    question: faq?.topic || "", 
    answer: faq?.reply_message || "", 
    format: faq ? getFormatDisplayString(faq.reply_format) : "",
    replyTitle: "",
    roomType: "",
    buttonName: "",
    options: [{ option: "", detail: "" }]
  });



  // Room types state
  const [roomTypes, setRoomTypes] = useState<string[]>([]);
  const [selectedRoomTypes, setSelectedRoomTypes] = useState<string[]>([]);

  const formatOptions = ["Message", "Room type", "Option with details"];

  // Auto-resize textarea when value changes
  useEffect(() => {
    const textarea = document.querySelector('textarea[placeholder="Enter reply message..."]') as HTMLTextAreaElement;
    if (textarea) {
      textarea.classList.remove('h-auto');
      textarea.classList.add('h-9');
      if (textarea.scrollHeight > 36) {
        textarea.classList.remove('h-9');
        textarea.classList.add('h-auto');
        textarea.style.height = textarea.scrollHeight + 'px';
      }
    }
  }, [newFAQ.answer]);

  // Load FAQ data when component mounts or faq changes
  useEffect(() => {
    if (faq) {
      const displayFormat = getFormatDisplayString(faq.reply_format);
      
      // Parse reply_payload for Room type and Option with details
      let replyTitle = "";
      let roomTypesSelection: string[] = [];
      let buttonName = "";
      let options = [{ option: "", detail: "" }];

      if (faq.reply_format === 'room_type' && faq.reply_payload) {
        const payload = faq.reply_payload as RoomTypePayload;
        if (payload.rooms) {
          roomTypesSelection = payload.rooms;
        }
        if (payload.buttonName) {
          buttonName = payload.buttonName;
        }
        // For room_type, reply_message is the replyTitle
        replyTitle = faq.reply_message;
      } else if (faq.reply_format === 'option_details' && faq.reply_payload) {
        const payload = faq.reply_payload as OptionDetailsPayload;
        if (payload && payload.length > 0) {
          options = payload;
        }
        // For option_details, reply_message is the replyTitle
        replyTitle = faq.reply_message;
      } else if (faq.reply_format === 'message') {
        // For message, reply_message is the answer
        replyTitle = "";
      }

      setNewFAQ({
        question: faq.topic,
        answer: faq.reply_format === 'message' ? faq.reply_message : replyTitle,
        format: displayFormat,
        replyTitle: replyTitle,
        roomType: roomTypesSelection.join(","),
        buttonName: buttonName,
        options: options
      });

      setSelectedRoomTypes(roomTypesSelection);
      
      // Load existing aliases into newAliasesUI when editing
      if (faq.aliases && faq.aliases.length > 0) {
        setNewAliasesUI(faq.aliases.map(alias => alias.alias));
      } else {
        setNewAliasesUI([]);
      }
    } else {
      // Reset for new FAQ creation
      setNewFAQ({
        question: "",
        answer: "",
        format: "",
        replyTitle: "",
        roomType: "",
        buttonName: "",
        options: [{ option: "", detail: "" }]
      });
      setSelectedRoomTypes([]);
      setNewAliasesUI([]);
    }
  }, [faq]);

  // Fetch room types
  useEffect(() => {
    const fetchRoomTypes = async () => {
      try {
        const response = await fetch('/api/room_types');
        const data = await response.json();
        const types = data.data?.map((roomType: { name: string }) => roomType.name) || [];
        setRoomTypes(types);
      } catch (error) {
        console.error('Error fetching room types:', error);
      }
    };
    fetchRoomTypes();
  }, [faq]);


  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [faqToDelete, setFaqToDelete] = useState<FAQ | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Aliases states
  const [newAliasesUI, setNewAliasesUI] = useState<string[]>([]);
  const [deletedAliasesUI, setDeletedAliasesUI] = useState<string[]>([]);
  const [editAliasesUI, setEditAliasesUI] = useState<string[]>([]);
  const [newAliasInput, setNewAliasInput] = useState<string>("");
  const [showAliases, setShowAliases] = useState(false);

  // Validation error states
  const [validationErrors, setValidationErrors] = useState<{
    question?: string;
    format?: string;
    answer?: string;
    replyTitle?: string;
    roomType?: string;
    buttonName?: string;
    options?: string;
    aliases?: string;
  }>({});

  // Drag controls for reordering
  const dragControls = useDragControls();

  const handleCreateFAQ = async () => {
    // Clear previous validation errors
    setValidationErrors({});
    
    // Set loading state
    setIsSaving(true);

    // Validation based on format
    const errors: typeof validationErrors = {};

    if (!newFAQ.question.trim()) {
      errors.question = "Please fill in Topic field";
    }

    if (!newFAQ.format.trim()) {
      errors.format = "Please select a Reply format";
    }

    if (newFAQ.format === "Message" && !newFAQ.answer.trim()) {
      errors.answer = "Please fill in Reply message field";
    }

    if ((newFAQ.format === "Room type" || newFAQ.format === "Option with details") && !newFAQ.replyTitle.trim()) {
      errors.replyTitle = "Please fill in Reply title field";
    }

    // Room type validation
    if (newFAQ.format === "Room type") {
      if (selectedRoomTypes.length === 0) {
        errors.roomType = "Please select at least one room type";
      }
      if (!newFAQ.buttonName.trim()) {
        errors.buttonName = "Please fill in Button name field";
      }
    }

    // Option details validation
    if (newFAQ.format === "Option with details") {
      const hasEmptyOptions = newFAQ.options.some(opt => !opt.option.trim() || !opt.detail.trim());
      if (hasEmptyOptions) {
        errors.options = "Please fill in all option and detail fields";
      }
    }

    // Aliases validation - only validate if there are aliases in the list
    if (showAliases && newAliasesUI.length > 0) {
      const hasEmptyAliases = newAliasesUI.some(alias => !alias.trim());
      if (hasEmptyAliases) {
        errors.aliases = "Please fill in all alias fields";
      }
    }

    // If there are validation errors, set them and return
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setIsSaving(false);
      return;
    }

    try {
      // Prepare payload based on format
      let reply_format: 'message' | 'room_type' | 'option_details' = 'message';
      let reply_payload: ReplyPayload = null;
      let reply_message = "";

      if (newFAQ.format === "Message") {
        reply_format = 'message';
        reply_payload = null;
        reply_message = newFAQ.answer;
      } else if (newFAQ.format === "Room type") {
        reply_format = 'room_type';
        reply_payload = {
          rooms: selectedRoomTypes,
          buttonName: newFAQ.buttonName || "View Details"
        };
        reply_message = newFAQ.replyTitle;
      } else if (newFAQ.format === "Option with details") {
        reply_format = 'option_details';
        reply_payload = newFAQ.options.filter(opt => opt.option.trim() && opt.detail.trim());
        reply_message = newFAQ.replyTitle;
      }

      console.log("Sending FAQ data:", {
        topic: newFAQ.question,
        reply_message,
        reply_format,
        reply_payload,
        created_by: "admin-user-id",
        aliases: newAliasesUI.filter(alias => alias.trim())
      });

      const isEditing = Boolean(faq?.id);
      const url = isEditing ? `/api/chat/faqs?id=${faq?.id}` : "/api/chat/faqs";
      const method = isEditing ? "PUT" : "POST";
      const body = isEditing
        ? {
            topic: newFAQ.question,
            reply_message,
            reply_format,
            reply_payload,
            aliases: newAliasesUI.filter(alias => alias.trim()),
            deleted_aliases: deletedAliasesUI, // Send aliases to delete
          }
        : {
            topic: newFAQ.question,
            reply_message,
            reply_format,
            reply_payload,
            created_by: null,
            aliases: newAliasesUI.filter(alias => alias.trim()),
          };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      console.log("Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("FAQ creation response:", data);

        setNewFAQ({ 
          question: "", 
          answer: "", 
          format: "",
          replyTitle: "",
          roomType: "",
          buttonName: "",
          options: [{ option: "", detail: "" }]
        });
        setNewAliasesUI([]);
        setDeletedAliasesUI([]); // Reset deleted aliases
        setNewAliasInput("");
        setShowAliases(false);
        setSelectedRoomTypes([]);
        onFetchFAQs();
        // FAQ updated/created successfully
        if (onShowSnackbar) {
          onShowSnackbar(isEditing ? "Suggestion updated successfully" : "Suggestion created successfully", "success");
        }
        // Close the create form
        if (onClose) {
          onClose();
        }
      } else {
        const errorData = await response.json();
        console.error("Failed to create FAQ:", errorData);
        // FAQ creation failed - error logged to console
        if (onShowSnackbar) {
          onShowSnackbar("Failed to save suggestion", "error");
        }
      }
    } catch (error) {
      console.error("Error creating FAQ:", error);
      // FAQ creation error - error logged to console
      if (onShowSnackbar) {
        onShowSnackbar("Error saving suggestion", "error");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
    <div>

      {/* Create New FAQ */}
      <div className="mb-6 pl-4 pr-0 py-4 border border-gray-200 rounded-lg bg-gray-100 transition-none">
        <div className="flex gap-0">
          {/* Left side - Form fields (95%) */}
          <div className="flex-1 w-[95%] space-y-4">
             <div className="grid grid-cols-2 gap-4">
               <div className="[&_label]:text-gray-900">
                 <label className="block text-sm font-medium mb-2">
                   Topic *
                 </label>
                 <div className="relative">
                   <Input
                     value={newFAQ.question}
                     onChange={(e) => {
                       setNewFAQ({ ...newFAQ, question: e.target.value });
                       // Clear error when user starts typing
                       if (validationErrors.question) {
                         setValidationErrors(prev => ({ ...prev, question: undefined }));
                       }
                     }}
                     placeholder="Enter topic..."
                     disabled={isReadOnly}
                     className={`${getInputClassName(!!validationErrors.question)} ${validationErrors.question ? 'pr-16' : 'pr-10'} !bg-white`}
                   />
                   {validationErrors.question && (
                     <img 
                       src="/icons/exclamation-icon.svg" 
                       alt="Error" 
                       className="absolute right-10 top-1/2 transform -translate-y-1/2 w-4 h-4" 
                     />
                   )}
                   <button
                     onClick={() => {
                       setShowAliases(!showAliases);
                       if (!showAliases) {
                         setNewAliasesUI([]);
                         setNewAliasInput("");
                       }
                     }}
                     className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-orange-500 hover:text-orange-700 cursor-pointer"
                     title={showAliases ? "Hide Aliases" : "Add Aliases"}
                   >
                     <FileQuestionMark className="w-4 h-4" />
                   </button>
                 </div>
                 {validationErrors.question && <ErrorMessage message={validationErrors.question} />}
               </div>
               <div className="[&_label]:text-gray-900">
                 <ChatbotDropdown
                   label="Reply format"
                   options={formatOptions}
                   value={newFAQ.format}
                   onChange={(value) => {
                     if (typeof value === 'string') {
                       setNewFAQ(prev => ({ ...prev, format: value }));
                       // Clear error when user selects format
                       if (validationErrors.format) {
                         setValidationErrors(prev => ({ ...prev, format: undefined }));
                       }
                     }
                   }}
                   placeholder="Select reply format..."
                   disabled={isReadOnly}
                   hasError={!!validationErrors.format}
                 />
                 {validationErrors.format && <ErrorMessage message={validationErrors.format} />}
               </div>
             </div>
          {showAliases && (
            <div className="space-y-2 [&_label]:text-gray-900">
              <label className="block text-sm font-medium mb-2">
                Linked Questions
              </label>
              
              {/* Input section - only show when not read-only */}
              {!isReadOnly && (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      value={newAliasInput}
                      onChange={(e) => {
                        setNewAliasInput(e.target.value);
                        // Clear error when user starts typing
                        if (validationErrors.aliases) {
                          setValidationErrors(prev => ({ ...prev, aliases: undefined }));
                        }
                      }}
                       placeholder="Enter alias phrase (separate multiple aliases with commas)..."
                      className={`${getInputClassName(!!validationErrors.aliases)} !bg-white ${validationErrors.aliases ? 'pr-10' : ''}`}
                    />
                    {validationErrors.aliases && (
                      <img 
                        src="/icons/exclamation-icon.svg" 
                        alt="Error" 
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4" 
                      />
                    )}
                  </div>
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={() => {
                       if (newAliasInput.trim()) {
                         // Split by comma and add multiple aliases
                         const aliases = newAliasInput.split(',').map(alias => alias.trim()).filter(alias => alias.length > 0);
                         
                         if (aliases.length > 0) {
                           // Check for duplicates with existing aliases in UI
                           const existingAliases = newAliasesUI.map(alias => alias.toLowerCase());
                           const duplicateAliases = aliases.filter(alias => existingAliases.includes(alias.toLowerCase()));
                           
                           if (duplicateAliases.length > 0) {
                             setValidationErrors(prev => ({ 
                               ...prev, 
                               aliases: `Duplicate aliases found: ${duplicateAliases.join(', ')}` 
                             }));
                             return;
                           }

                           // Check for duplicates within the input itself
                           const uniqueAliases = [...new Set(aliases.map(alias => alias.toLowerCase()))];
                           if (uniqueAliases.length !== aliases.length) {
                             setValidationErrors(prev => ({ 
                               ...prev, 
                               aliases: "Duplicate aliases found in your input" 
                             }));
                             return;
                           }

                           // Check for duplicates with existing aliases from database
                           const existingDbAliases = faq?.aliases?.map(a => a.alias.toLowerCase()) || [];
                           const duplicateDbAliases = aliases.filter(alias => existingDbAliases.includes(alias.toLowerCase()));
                           
                           if (duplicateDbAliases.length > 0) {
                             setValidationErrors(prev => ({ 
                               ...prev, 
                               aliases: `These aliases already exist: ${duplicateDbAliases.join(', ')}` 
                             }));
                             return;
                           }

                           setNewAliasesUI([
                             ...newAliasesUI,
                             ...aliases,
                           ]);
                           setNewAliasInput("");
                           // Clear error when successfully adding aliases
                           if (validationErrors.aliases) {
                             setValidationErrors(prev => ({ ...prev, aliases: undefined }));
                           }
                         } else {
                           // Show error if no valid aliases after splitting
                           setValidationErrors(prev => ({ ...prev, aliases: "Please enter at least one valid alias" }));
                         }
                       } else {
                         // Show error if trying to add empty alias
                         setValidationErrors(prev => ({ ...prev, aliases: "Please enter an alias before adding" }));
                       }
                     }}
                     className="cursor-pointer border-orange-500 text-orange-500 hover:bg-orange-50"
                   >
                     + Add
                   </Button>
                </div>
              )}
              {validationErrors.aliases && <ErrorMessage message={validationErrors.aliases} />}
              {/* All aliases (existing + new) */}
              {(faq?.aliases && faq.aliases.length > 0) || newAliasesUI.length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-2">
                  {/* Existing aliases */}
                  {faq?.aliases && faq.aliases.length > 0 && 
                    faq.aliases
                      .filter(alias => !deletedAliasesUI.includes(alias.id)) // Hide deleted aliases
                      .map((alias) => (
                        <div
                          key={alias.id}
                          className={`flex items-center rounded-md px-3 py-1 text-sm ${
                            isReadOnly ? "bg-gray-200 text-gray-600" : "bg-gray-300 text-gray-700"
                          }`}
                        >
                          <span>{alias.alias}</span>
                          {!isReadOnly && (
                            <button
                              onClick={() => {
                                // Add to deleted aliases list instead of calling API
                                setDeletedAliasesUI([...deletedAliasesUI, alias.id]);
                              }}
                              className="ml-2 text-gray-500 hover:text-gray-700 cursor-pointer"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))
                  }
                  
                  {/* New aliases being added */}
                  {newAliasesUI.map((alias, index) => (
                    <div
                      key={`new-${index}`}
                      className={`flex items-center rounded-md px-3 py-1 text-sm ${
                        isReadOnly ? "bg-gray-200 text-gray-600" : "bg-gray-300 text-gray-700"
                      }`}
                    >
                      <span>{alias}</span>
                      {!isReadOnly && (
                        <button
                          onClick={() => {
                            setNewAliasesUI(
                              newAliasesUI.filter((_, i) => i !== index)
                            );
                          }}
                          className="ml-2 text-gray-500 hover:text-gray-700 cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}
          
          {/* Dynamic fields based on format */}
          {newFAQ.format === "Message" && (
            <div className="[&_label]:text-gray-900">
              <label className="block text-sm font-medium mb-2">
                Reply message
              </label>
              <div className="relative">
                <textarea
                  value={newFAQ.answer}
                  onChange={(e) => {
                    setNewFAQ({ ...newFAQ, answer: e.target.value });
                    // Clear error when user starts typing
                    if (validationErrors.answer) {
                      setValidationErrors(prev => ({ ...prev, answer: undefined }));
                    }
                    // Auto-resize textarea - start from h-9 (36px) minimum
                    e.target.classList.remove('h-auto');
                    e.target.classList.add('h-9');
                    if (e.target.scrollHeight > 36) {
                      e.target.classList.remove('h-9');
                      e.target.classList.add('h-auto');
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }
                  }}
                  placeholder="Enter reply message..."
                  disabled={isReadOnly}
                  className={`${getTextareaClassName(!!validationErrors.answer)} !bg-white ${validationErrors.answer ? 'pr-10' : ''}`}
                />
                {validationErrors.answer && (
                  <img 
                    src="/icons/exclamation-icon.svg" 
                    alt="Error" 
                    className="absolute right-3 top-3 w-4 h-4" 
                  />
                )}
              </div>
              {validationErrors.answer && <ErrorMessage message={validationErrors.answer} />}
            </div>
          )}

          {newFAQ.format === "Room type" && (
            <>
              <div className="[&_label]:text-gray-900">
                <label className="block text-sm font-medium mb-2">
                  Reply title
                </label>
                <div className="relative">
                  <Input
                    value={newFAQ.replyTitle}
                    onChange={(e) => {
                      setNewFAQ({ ...newFAQ, replyTitle: e.target.value });
                      // Clear error when user starts typing
                      if (validationErrors.replyTitle) {
                        setValidationErrors(prev => ({ ...prev, replyTitle: undefined }));
                      }
                    }}
                    placeholder="Enter reply title..."
                    disabled={isReadOnly}
                    className={`${getInputClassName(!!validationErrors.replyTitle)} !bg-white ${validationErrors.replyTitle ? 'pr-10' : ''}`}
                  />
                  {validationErrors.replyTitle && (
                    <img 
                      src="/icons/exclamation-icon.svg" 
                      alt="Error" 
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4" 
                    />
                  )}
                </div>
                {validationErrors.replyTitle && <ErrorMessage message={validationErrors.replyTitle} />}
              </div>
              <div className="[&_label]:text-gray-900">
                <ChatbotDropdown
                  label="Room Type"
                  options={roomTypes}
                  value={selectedRoomTypes}
                  onChange={(value) => {
                    if (Array.isArray(value)) {
                      setSelectedRoomTypes(value);
                      setNewFAQ(prev => ({ ...prev, roomType: value.join(",") }));
                      // Clear error when user selects room types
                      if (validationErrors.roomType) {
                        setValidationErrors(prev => ({ ...prev, roomType: undefined }));
                      }
                    }
                  }}
                  placeholder="Select room types..."
                  disabled={isReadOnly}
                  multiple={true}
                  searchable={true}
                  showAllOption={true}
                  hasError={!!validationErrors.roomType}
                />
                {validationErrors.roomType && <ErrorMessage message={validationErrors.roomType} />}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Button Name
                </label>
                <div className="relative">
                  <Input
                    value={newFAQ.buttonName}
                    onChange={(e) => {
                      setNewFAQ({ ...newFAQ, buttonName: e.target.value });
                      // Clear error when user starts typing
                      if (validationErrors.buttonName) {
                        setValidationErrors(prev => ({ ...prev, buttonName: undefined }));
                      }
                    }}
                    placeholder="Enter button name..."
                    disabled={isReadOnly}
                    className={`${getInputClassName(!!validationErrors.buttonName)} !bg-white ${validationErrors.buttonName ? 'pr-10' : ''}`}
                  />
                  {validationErrors.buttonName && (
                    <img 
                      src="/icons/exclamation-icon.svg" 
                      alt="Error" 
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4" 
                    />
                  )}
                </div>
                {validationErrors.buttonName && <ErrorMessage message={validationErrors.buttonName} />}
              </div>
            </>
          )}

          {newFAQ.format === "Option with details" && (
            <>
              <div className="[&_label]:text-gray-900">
                <label className="block text-sm font-medium mb-2">
                  Reply title
                </label>
                <div className="relative">
                  <Input
                    value={newFAQ.replyTitle}
                    onChange={(e) => {
                      setNewFAQ({ ...newFAQ, replyTitle: e.target.value });
                      // Clear error when user starts typing
                      if (validationErrors.replyTitle) {
                        setValidationErrors(prev => ({ ...prev, replyTitle: undefined }));
                      }
                    }}
                    placeholder="Enter reply title..."
                    disabled={isReadOnly}
                    className={`${getInputClassName(!!validationErrors.replyTitle)} !bg-white ${validationErrors.replyTitle ? 'pr-10' : ''}`}
                  />
                  {validationErrors.replyTitle && (
                    <img 
                      src="/icons/exclamation-icon.svg" 
                      alt="Error" 
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4" 
                    />
                  )}
                </div>
                {validationErrors.replyTitle && <ErrorMessage message={validationErrors.replyTitle} />}
              </div>
              <div>
                {newFAQ.options.map((option, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <div className="flex-1 [&_label]:text-gray-900">
                      <label className="block text-sm font-medium mb-2">
                        Option
                      </label>
                      <div className="relative">
                        <Input
                          value={option.option}
                          onChange={(e) => {
                            const newOptions = [...newFAQ.options];
                            newOptions[index].option = e.target.value;
                            setNewFAQ({ ...newFAQ, options: newOptions });
                            // Clear error when user starts typing
                            if (validationErrors.options) {
                              setValidationErrors(prev => ({ ...prev, options: undefined }));
                            }
                          }}
                          placeholder="Enter option..."
                          disabled={isReadOnly}
                          className={`${getInputClassName(!!validationErrors.options)} !bg-white ${validationErrors.options ? 'pr-10' : ''}`}
                        />
                        {validationErrors.options && (
                          <img 
                            src="/icons/exclamation-icon.svg" 
                            alt="Error" 
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4" 
                          />
                        )}
                      </div>
                    </div>
                    <div className="flex-1 [&_label]:text-gray-900">
                      <label className="block text-sm font-medium mb-2">
                        Detail
                      </label>
                      <div className="relative">
                        <Input
                          value={option.detail}
                          onChange={(e) => {
                            const newOptions = [...newFAQ.options];
                            newOptions[index].detail = e.target.value;
                            setNewFAQ({ ...newFAQ, options: newOptions });
                            // Clear error when user starts typing
                            if (validationErrors.options) {
                              setValidationErrors(prev => ({ ...prev, options: undefined }));
                            }
                          }}
                          placeholder="Enter detail..."
                          disabled={isReadOnly}
                          className={`${getInputClassName(!!validationErrors.options)} !bg-white ${validationErrors.options ? 'pr-10' : ''}`}
                        />
                        {validationErrors.options && (
                          <img 
                            src="/icons/exclamation-icon.svg" 
                            alt="Error" 
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4" 
                          />
                        )}
                      </div>
                    </div>
                    {newFAQ.options.length > 1 && !isReadOnly && (
                      <button
                        type="button"
                        onClick={() => {
                          const newOptions = newFAQ.options.filter((_, i) => i !== index);
                          setNewFAQ({ ...newFAQ, options: newOptions });
                        }}
                        className="px-2 py-1 text-red-500 text-sm cursor-pointer hover:text-red-700"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {validationErrors.options && <ErrorMessage message={validationErrors.options} />}
                {!isReadOnly && (
                  <Button
                    type="button"
                    onClick={() => {
                      setNewFAQ({
                        ...newFAQ,
                        options: [...newFAQ.options, { option: "", detail: "" }]
                      });
                    }}
                    variant="outline"
                    className="mt-2 bg-white cursor-pointer border-orange-500 text-orange-500 hover:bg-orange-50"
                  >
                    Add Option
                  </Button>
                )}
              </div>
            </>
          )}
          {!isReadOnly && (
            <div className="flex gap-2">
              <Button
                onClick={handleCreateFAQ}
                disabled={isSaving}
                className="bg-orange-500 text-white hover:bg-orange-600 disabled:bg-gray-300 disabled:text-gray-600 cursor-pointer"
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button
                onClick={() => {
                  if (faq) {
                    // If editing existing FAQ, reset to original values
                    const displayFormat = getFormatDisplayString(faq.reply_format);
                    
                    // Parse original reply_payload
                    let replyTitle = "";
                    let roomTypesSelection: string[] = [];
                    let buttonName = "";
                    let options = [{ option: "", detail: "" }];

                    if (faq.reply_format === 'room_type' && faq.reply_payload) {
                      const payload = faq.reply_payload as RoomTypePayload;
                      if (payload.rooms) {
                        roomTypesSelection = payload.rooms;
                      }
                      if (payload.buttonName) {
                        buttonName = payload.buttonName;
                      }
                      replyTitle = faq.reply_message;
                    } else if (faq.reply_format === 'option_details' && faq.reply_payload) {
                      const payload = faq.reply_payload as OptionDetailsPayload;
                      if (payload && payload.length > 0) {
                        options = payload;
                      }
                      replyTitle = faq.reply_message;
                    } else if (faq.reply_format === 'message') {
                      replyTitle = "";
                    }

                    setNewFAQ({
                      question: faq.topic,
                      answer: faq.reply_format === 'message' ? faq.reply_message : replyTitle,
                      format: displayFormat,
                      replyTitle: replyTitle,
                      roomType: roomTypesSelection.join(","),
                      buttonName: buttonName,
                      options: options
                    });

                    setSelectedRoomTypes(roomTypesSelection);
                  } else {
                    // If creating new FAQ, clear form
                    setNewFAQ({ 
                      question: "", 
                      answer: "", 
                      format: "",
                      replyTitle: "",
                      roomType: "",
                      buttonName: "",
                      options: [{ option: "", detail: "" }]
                    });
                    setSelectedRoomTypes([]);
                  }
                  setNewAliasesUI([]);
                  setDeletedAliasesUI([]); // Reset deleted aliases
                  setNewAliasInput("");
                  setShowAliases(false);
                  if (onClose) {
                    onClose();
                  }
                }}
                disabled={isSaving}
                variant="ghost"
                className="cursor-pointer bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </Button>
            </div>
          )}
          </div>

          {/* Right side - Icons (5%) */}
          <div className="w-[5%] flex flex-col items-center justify-start">
            <button 
              className="p-2 text-gray-700 hover:text-gray-900 cursor-grab active:cursor-grabbing" 
              title="Drag"
              onPointerDown={(e) => {
                e.preventDefault();
                dragControls.start(e);
              }}
            >
              <img src="/drag.svg" alt="Drag" className="w-5 h-5" />
            </button>
            {faq && (
              <button 
                className="p-2 text-gray-700 hover:text-gray-900 cursor-pointer" 
                title="Edit"
                onClick={() => {
                  if (onEdit) {
                    onEdit();
                  }
                }}
              >
                <img src="/pencil.svg" alt="Edit" className="w-5 h-5" />
              </button>
            )}
            {faq && (
              <button 
                className="p-2 text-gray-700 hover:text-gray-900 cursor-pointer" 
                title="Delete"
                onClick={() => {
                  setFaqToDelete(faq);
                  setShowDeleteModal(true);
                }}
              >
                <img src="/delete.svg" alt="Delete" className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

    </div>

    {/* Delete Confirmation Modal */}
    <ChatbotConfirmModal
      open={showDeleteModal && Boolean(faqToDelete)}
      title="Delete Suggestion menu?"
      message={faqToDelete ? `Are you sure you want to delete "${faqToDelete.topic}" ?` : ""}
      confirmText="Yes, I want to delete"
      cancelText={"No, I don't"}
      onConfirm={() => {
        if (faqToDelete && onDeleteFAQ) {
          onDeleteFAQ(faqToDelete.id);
        }
        setShowDeleteModal(false);
        setFaqToDelete(null);
      }}
      onClose={() => {
        setShowDeleteModal(false);
        setFaqToDelete(null);
      }}
    />
    </>
  );
}