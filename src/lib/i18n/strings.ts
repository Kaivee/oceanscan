export type Lang = "en" | "hi"

const en = {
  newSurvey: "New Survey",
  "tab.frame": "Frame",
  "tab.map": "Map",
  "tab.brief": "Brief",
  modelChip: "MODEL U-NET-SSS-EDGE · 38MS/FRAME",
  uploadLog: "Upload Log",
  runDetection: "Run Detection",

  heroKicker: "Hydrographic Debris Survey",
  heroTitleStart: "Find the ",
  heroTitleHighlight: "ghost nets",
  heroTitleEnd: " before they find the reef.",
  heroBody:
    "Upload a side-scan sonar log. OceanScan separates man-made debris from seafloor clutter and hands back a geotagged, priority-ordered cleanup report.",
  dropOrBrowse: "Drop a sonar log, or click to browse",
  fileTypesHint: ".XTF · .JSF · .PNG — up to 500MB",
  loadSample: "No file handy? Load a sample survey →",
  recentSurveys: "Recent Surveys — {area}",
  today: "TODAY",
  yesterday: "YESTERDAY",
  contactsShort: "{n} cont.",

  ingestSurveyLog: "Ingest Survey Log",
  edgeInferenceHint: ".XTF · .JSF · .PNG — edge inference",
  dropLogHere: "Drop a sonar log here",
  orClickBrowse: "or click to browse",
  anomalyOne: "{n} anomaly detected",
  anomalyMany: "{n} anomalies detected",
  runningInference: "Running inference...",
  transferring: "Transferring to edge node · {p}%",
  continueToFrame: "Continue to Frame",
  errorBackendSuffix: "Start the backend at {url} and retry.",
  unsupportedFormat: "Unsupported format. Accepted: .XTF, .JSF, .PNG, .JPG, .TIFF",

  viewOriginal: "Original",
  viewSimulated: "Simulated",
  viewDenoised: "Denoised",
  showAttention: "Show Attention",
  confidence: "Confidence",
  shownCount: "{shown} / {total} shown",
  portChannel: "Port Channel",
  stbdChannel: "Stbd Channel",
  frameCaption: "ARIS3K-9 · SIDE-SCAN WATERFALL · WGS-84",
  statusOriginal: "ORIGINAL IMAGE",
  statusDenoised: "DENOISED",
  statusSimulated: "SIMULATED",
  acousticIntensity: "Acoustic Intensity (dB)",
  contactOne: "{n} contact",
  contactMany: "{n} contacts",
  detectionReport: "Detection Report",
  exportCsv: "Export CSV",
  exportJson: "Export JSON",
  colId: "ID",
  colClass: "Class",
  colConf: "Conf.",
  colPriority: "Priority",
  colLat: "Lat",
  colLon: "Lon",
  noDetections: "No detections above the {p}% threshold.",
  noSurveyFrame: "No survey frame loaded",
  noSurveyBody:
    "Load a sonar log or a sample survey to run detection and inspect the frame.",
  loadSurvey: "Load a survey",
  frameOriginal: "Original sonar frame",

  surveyMap: "Survey Map",
  datum: "Bristol Channel · datum WGS-84",
  targetOne: "{n} geotagged target",
  targetMany: "{n} geotagged targets",

  cleanupMissionBrief: "Cleanup Mission Brief",
  surveyMeta: "SURVEY {id} · {file} · GENERATED {time}",
  surveyTrajectory: "SURVEY TRAJECTORY",
  actionItems: "Action Items",
  targetDetail: "{conf}% confidence · {lat}, {lon} · {w} × {h} m",
  exportPdfBrief: "Export PDF Brief",
  dispatching: "Dispatching…",
  dispatched: "Dispatched to field team ✓",
  sendToFieldTeam: "Send to Field Team",
  emailSubject: "[OceanScan] Field Dispatch — Survey {id}",
  emailBody:
    "SURVEY {id} · {file} · GENERATED {time}\n{area}\n\nRECOVERY ORDER\n{lines}\n\nDispatch prepared by OceanScan edge inference.",

  printTitle: "OceanScan Mission Brief",
  printHeading: "Cleanup Mission Brief",
  printConf: "Confidence",
  printCoords: "Coordinates",
  printDims: "Dims (L×W)",
  printPriority: "Priority",

  footer: "OCEANSCAN · HYDROGRAPHIC DEBRIS SURVEY",
} as const

export type UiKey = keyof typeof en

const hi: Record<UiKey, string> = {
  newSurvey: "नया सर्वेक्षण",
  "tab.frame": "फ्रेम",
  "tab.map": "नक्शा",
  "tab.brief": "ब्रीफ",
  modelChip: "मॉडल U-NET-SSS-EDGE · 38MS/FRAME",
  uploadLog: "लॉग अपलोड करें",
  runDetection: "डिटेक्शन चलाएँ",

  heroKicker: "हाइड्रोग्राफिक मलबा सर्वेक्षण",
  heroTitleStart: "",
  heroTitleHighlight: "फंसे हुए जालों",
  heroTitleEnd: " को रीफ तक पहुँचने से पहले खोजें।",
  heroBody:
    "साइड-स्कैन सोनार लॉग अपलोड करें। OceanScan कृत्रिम मलबे को समुद्र तल की बनावट से अलग करता है और एक जियोटैग किया हुआ, प्राथमिकता-क्रमित सफाई रिपोर्ट देता है।",
  dropOrBrowse: "सोनार लॉग ड्रॉप करें, या ब्राउज़ करने के लिए क्लिक करें",
  fileTypesHint: ".XTF · .JSF · .PNG — 500MB तक",
  loadSample: "कोई फाइल नहीं? नमूना सर्वेक्षण लोड करें →",
  recentSurveys: "हालिया सर्वेक्षण — {area}",
  today: "आज",
  yesterday: "कल",
  contactsShort: "{n} संपर्क",

  ingestSurveyLog: "सर्वेक्षण लॉग दर्ज करें",
  edgeInferenceHint: ".XTF · .JSF · .PNG — एज इन्फ्रेनेंस",
  dropLogHere: "सोनार लॉग यहाँ ड्रॉप करें",
  orClickBrowse: "या ब्राउज़ करने के लिए क्लिक करें",
  anomalyOne: "{n} विसंगति मिली",
  anomalyMany: "{n} विसंगतियाँ मिलीं",
  runningInference: "इन्फ्रेनेंस चल रहा है...",
  transferring: "एज नोड पर स्थानांतरित हो रहा है · {p}%",
  continueToFrame: "फ्रेम पर जारी रखें",
  errorBackendSuffix: "बैकएंड {url} पर शुरू करें और पुनः प्रयास करें।",
  unsupportedFormat: "असमर्थित फॉर्मेट। स्वीकृत: .XTF, .JSF, .PNG, .JPG, .TIFF",

  viewOriginal: "मूल",
  viewSimulated: "सिम्युलेटेड",
  viewDenoised: "डिनॉइज़्ड",
  showAttention: "अटेंशन दिखाएँ",
  confidence: "कॉन्फिडेंस",
  shownCount: "{shown} / {total} दिखाए गए",
  portChannel: "पोर्ट चैनल",
  stbdChannel: "स्टारबोर्ड चैनल",
  frameCaption: "ARIS3K-9 · साइड-स्कैन वॉटरफॉल · WGS-84",
  statusOriginal: "मूल छवि",
  statusDenoised: "डिनॉइज़्ड",
  statusSimulated: "सिम्युलेटेड",
  acousticIntensity: "ध्वनिक तीव्रता (dB)",
  contactOne: "{n} संपर्क",
  contactMany: "{n} संपर्क",
  detectionReport: "डिटेक्शन रिपोर्ट",
  exportCsv: "CSV निर्यात करें",
  exportJson: "JSON निर्यात करें",
  colId: "आईडी",
  colClass: "वर्ग",
  colConf: "विश्वास",
  colPriority: "प्राथमिकता",
  colLat: "अक्षांश",
  colLon: "देशांतर",
  noDetections: "{p}% सीमा से ऊपर कोई डिटेक्शन नहीं।",
  noSurveyFrame: "कोई सर्वेक्षण फ्रेम लोड नहीं हुआ",
  noSurveyBody:
    "डिटेक्शन चलाने और फ्रेम की जाँच करने के लिए सोनार लॉग या नमूना सर्वेक्षण लोड करें।",
  loadSurvey: "सर्वेक्षण लोड करें",
  frameOriginal: "मूल सोनार फ्रेम",

  surveyMap: "सर्वेक्षण नक्शा",
  datum: "ब्रिस्टल चैनल · डेटम WGS-84",
  targetOne: "{n} जियोटैग किया गया लक्ष्य",
  targetMany: "{n} जियोटैग किए गए लक्ष्य",

  cleanupMissionBrief: "सफाई मिशन ब्रीफ",
  surveyMeta: "सर्वेक्षण {id} · {file} · निर्मित {time}",
  surveyTrajectory: "सर्वेक्षण प्रक्षेपवक्र",
  actionItems: "कार्रवाई आइटम",
  targetDetail: "{conf}% विश्वास · {lat}, {lon} · {w} × {h} मी",
  exportPdfBrief: "PDF ब्रीफ निर्यात करें",
  dispatching: "भेजा जा रहा है…",
  dispatched: "फील्ड टीम को भेजा गया ✓",
  sendToFieldTeam: "फील्ड टीम को भेजें",
  emailSubject: "[OceanScan] फील्ड डिस्पैच — सर्वेक्षण {id}",
  emailBody:
    "सर्वेक्षण {id} · {file} · निर्मित {time}\n{area}\n\nनिकासी क्रम\n{lines}\n\nयह डिस्पैच OceanScan एज इन्फ्रेनेंस द्वारा तैयार किया गया।",

  printTitle: "OceanScan मिशन ब्रीफ",
  printHeading: "सफाई मिशन ब्रीफ",
  printConf: "विश्वास",
  printCoords: "निर्देशांक",
  printDims: "आयाम (L×W)",
  printPriority: "प्राथमिकता",

  footer: "OCEANSCAN · हाइड्रोग्राफिक मलबा सर्वेक्षण",
}

const enClassLabels: Record<string, string> = {
  "Ghost Net": "Ghost Net",
  "Entangled Net": "Entangled Net",
  "Metal Drum": "Metal Drum",
  "Shipwreck": "Shipwreck",
  "Natural Formation": "Natural Formation",
  "Debris Field": "Debris Field",
}

const hiClassLabels: Record<string, string> = {
  "Ghost Net": "फंसा हुआ जाल",
  "Entangled Net": "उलझा हुआ जाल",
  "Metal Drum": "धातु ड्रम",
  "Shipwreck": "जहाज़ का मलबा",
  "Natural Formation": "प्राकृतिक संरचना",
  "Debris Field": "मलबा क्षेत्र",
}

const enFieldActions: Record<string, string> = {
  "Ghost Net": "Retrieve — high entanglement risk for marine fauna.",
  "Entangled Net": "Retrieve — high entanglement risk for marine fauna.",
  "Metal Drum": "Schedule recovery — medium risk, compact metallic object.",
  "Shipwreck": "Confirm identity on next pass — large object, log and monitor.",
  "Natural Formation": "Monitor — likely natural formation; verify only if repeated.",
  "Debris Field": "Monitor — likely natural formation; verify only if repeated.",
}

const hiFieldActions: Record<string, string> = {
  "Ghost Net": "निकालें — समुद्री जीवों के लिए उच्च उलझाव जोखिम।",
  "Entangled Net": "निकालें — समुद्री जीवों के लिए उच्च उलझाव जोखिम।",
  "Metal Drum": "निकासी निर्धारित करें — मध्यम जोखिम, कॉम्पैक्ट धातु वस्तु।",
  "Shipwreck": "अगले पास पर पहचान की पुष्टि करें — बड़ी वस्तु, लॉग और निगरानी करें।",
  "Natural Formation": "निगरानी करें — संभवतः प्राकृतिक संरचना; दोहराने पर ही सत्यापित करें।",
  "Debris Field": "निगरानी करें — संभवतः प्राकृतिक संरचना; दोहराने पर ही सत्यापित करें।",
}

const enPriorityActions: Record<string, string> = {
  P1: "Recover — auto-flagged {p} by edge inference. Verify with ROV before recovery.",
  P2: "Schedule recovery — auto-flagged {p} by edge inference. Verify with ROV before recovery.",
  P3: "Confirm identity on next pass — auto-flagged {p} by edge inference.",
}

const hiPriorityActions: Record<string, string> = {
  P1: "निकालें — एज इन्फ्रेनेंस द्वारा {p} स्वचालित चिह्नित। निकासी से पहले ROV से सत्यापित करें।",
  P2: "निकासी निर्धारित करें — एज इन्फ्रेनेंस द्वारा {p} स्वचालित चिह्नित। निकासी से पहले ROV से सत्यापित करें।",
  P3: "अगले पास पर पहचान की पुष्टि करें — एज इन्फ्रेनेंस द्वारा {p} स्वचालित चिह्नित।",
}

const enPriorityLabels: Record<string, string> = {
  P1: "PRIORITY P1",
  P2: "PRIORITY P2",
  P3: "PRIORITY P3",
}

const hiPriorityLabels: Record<string, string> = {
  P1: "प्राथमिकता P1",
  P2: "प्राथमिकता P2",
  P3: "प्राथमिकता P3",
}

export function ts(lang: Lang, key: UiKey, vars?: Record<string, string | number>): string {
  const str: string = (lang === "hi" ? hi : en)[key]
  if (!vars) return str
  return str.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m))
}

export function classLabel(lang: Lang, cls: string): string {
  const map = lang === "hi" ? hiClassLabels : enClassLabels
  return (map as Record<string, string>)[cls] ?? cls
}

export function fieldAction(lang: Lang, cls: string, priority: string): string {
  const map = lang === "hi" ? hiFieldActions : enFieldActions
  const pmap = lang === "hi" ? hiPriorityActions : enPriorityActions
  if (cls in map) return map[cls] as string
  const key = priority in pmap ? priority : "P3"
  return (pmap[key] as string).replace(/\{p\}/g, priority)
}

export function priorityLabel(lang: Lang, p: string): string {
  const map = lang === "hi" ? hiPriorityLabels : enPriorityLabels
  return (map as Record<string, string>)[p] ?? p
}