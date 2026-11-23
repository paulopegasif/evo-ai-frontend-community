/**
 * App icon set: Hugeicons (free, MIT), the set shipped with coss ui.
 *
 * Exports keep the Lucide names the code already used, so screens import
 * { Plus, Trash2 } from "@/components/icons" and never touch the icon package.
 * Add an icon by mapping a name here; do not import lucide-react or
 * @hugeicons/* directly in screens (ESLint enforces this).
 */
import { forwardRef, type ComponentType, type SVGProps } from 'react';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  Activity01Icon as HActivity01Icon,
  Add01Icon as HAdd01Icon,
  AiNetworkIcon as HAiNetworkIcon,
  Alert02Icon as HAlert02Icon,
  AlertCircleIcon as HAlertCircleIcon,
  AnalyticsUpIcon as HAnalyticsUpIcon,
  ArchiveIcon as HArchiveIcon,
  ArrowDown01Icon as HArrowDown01Icon,
  ArrowDownRight01Icon as HArrowDownRight01Icon,
  ArrowLeft01Icon as HArrowLeft01Icon,
  ArrowLeftRightIcon as HArrowLeftRightIcon,
  ArrowRight01Icon as HArrowRight01Icon,
  ArrowTurnDownIcon as HArrowTurnDownIcon,
  ArrowTurnUpIcon as HArrowTurnUpIcon,
  ArrowUp01Icon as HArrowUp01Icon,
  ArrowUpDownIcon as HArrowUpDownIcon,
  ArrowUpRight01Icon as HArrowUpRight01Icon,
  AttachmentIcon as HAttachmentIcon,
  Award01Icon as HAward01Icon,
  BookOpen01Icon as HBookOpen01Icon,
  BotIcon as HBotIcon,
  BrainIcon as HBrainIcon,
  Briefcase01Icon as HBriefcase01Icon,
  BubbleChatIcon as HBubbleChatIcon,
  Building01Icon as HBuilding01Icon,
  Building02Icon as HBuilding02Icon,
  BulbIcon as HBulbIcon,
  Calendar01Icon as HCalendar01Icon,
  Calendar02Icon as HCalendar02Icon,
  Calendar03Icon as HCalendar03Icon,
  CalendarCheckIn01Icon as HCalendarCheckIn01Icon,
  CalendarRemove02Icon as HCalendarRemove02Icon,
  CalendarSetting01Icon as HCalendarSetting01Icon,
  Camera01Icon as HCamera01Icon,
  Cancel01Icon as HCancel01Icon,
  CancelCircleIcon as HCancelCircleIcon,
  ChampionIcon as HChampionIcon,
  ChartColumnIcon as HChartColumnIcon,
  CheckListIcon as HCheckListIcon,
  CheckmarkCircle01Icon as HCheckmarkCircle01Icon,
  CheckmarkCircle02Icon as HCheckmarkCircle02Icon,
  CheckmarkSquare01Icon as HCheckmarkSquare01Icon,
  Clock01Icon as HClock01Icon,
  CloudIcon as HCloudIcon,
  CodeIcon as HCodeIcon,
  ComputerIcon as HComputerIcon,
  ContactIcon as HContactIcon,
  Copy01Icon as HCopy01Icon,
  CursorPointer02Icon as HCursorPointer02Icon,
  Delete01Icon as HDelete01Icon,
  Delete02Icon as HDelete02Icon,
  Dollar01Icon as HDollar01Icon,
  DollarCircleIcon as HDollarCircleIcon,
  Download01Icon as HDownload01Icon,
  Drag01Icon as HDrag01Icon,
  Edit01Icon as HEdit01Icon,
  ElectricPlugsIcon as HElectricPlugsIcon,
  Facebook01Icon as HFacebook01Icon,
  File01Icon as HFile01Icon,
  File02Icon as HFile02Icon,
  FileAddIcon as HFileAddIcon,
  FileUploadIcon as HFileUploadIcon,
  FileVideoIcon as HFileVideoIcon,
  FileZipIcon as HFileZipIcon,
  Film01Icon as HFilm01Icon,
  FilterIcon as HFilterIcon,
  FingerPrintIcon as HFingerPrintIcon,
  FirstBracketIcon as HFirstBracketIcon,
  FlashIcon as HFlashIcon,
  FloppyDiskIcon as HFloppyDiskIcon,
  Forward01Icon as HForward01Icon,
  FrownIcon as HFrownIcon,
  GitBranchIcon as HGitBranchIcon,
  GitForkIcon as HGitForkIcon,
  GitMergeIcon as HGitMergeIcon,
  GlobeIcon as HGlobeIcon,
  GridIcon as HGridIcon,
  GridTableIcon as HGridTableIcon,
  HardDriveIcon as HHardDriveIcon,
  HashtagIcon as HHashtagIcon,
  HelpCircleIcon as HHelpCircleIcon,
  Home01Icon as HHome01Icon,
  Image01Icon as HImage01Icon,
  ImageNotFound01Icon as HImageNotFound01Icon,
  InboxIcon as HInboxIcon,
  InformationCircleIcon as HInformationCircleIcon,
  InstagramIcon as HInstagramIcon,
  Invoice01Icon as HInvoice01Icon,
  KanbanIcon as HKanbanIcon,
  Key01Icon as HKey01Icon,
  KeyboardIcon as HKeyboardIcon,
  Layers01Icon as HLayers01Icon,
  Layout01Icon as HLayout01Icon,
  Layout3ColumnIcon as HLayout3ColumnIcon,
  LayoutGridIcon as HLayoutGridIcon,
  LibraryIcon as HLibraryIcon,
  Link02Icon as HLink02Icon,
  ListViewIcon as HListViewIcon,
  Loading03Icon as HLoading03Icon,
  Location01Icon as HLocation01Icon,
  LocationOffline01Icon as HLocationOffline01Icon,
  LockIcon as HLockIcon,
  Login01Icon as HLogin01Icon,
  Logout01Icon as HLogout01Icon,
  MagicWand01Icon as HMagicWand01Icon,
  Mail01Icon as HMail01Icon,
  MailOpen01Icon as HMailOpen01Icon,
  MailReply01Icon as HMailReply01Icon,
  MailSend01Icon as HMailSend01Icon,
  MapsIcon as HMapsIcon,
  Maximize01Icon as HMaximize01Icon,
  Maximize02Icon as HMaximize02Icon,
  Megaphone01Icon as HMegaphone01Icon,
  MehIcon as HMehIcon,
  Menu01Icon as HMenu01Icon,
  Message01Icon as HMessage01Icon,
  Message02Icon as HMessage02Icon,
  MessageAdd01Icon as HMessageAdd01Icon,
  MessageMultiple01Icon as HMessageMultiple01Icon,
  MessageSquareReplyIcon as HMessageSquareReplyIcon,
  Mic01Icon as HMic01Icon,
  Minimize02Icon as HMinimize02Icon,
  MinusSignIcon as HMinusSignIcon,
  MoneySavingJarIcon as HMoneySavingJarIcon,
  MoonIcon as HMoonIcon,
  MoreHorizontalIcon as HMoreHorizontalIcon,
  MoreVerticalIcon as HMoreVerticalIcon,
  MoveRightIcon as HMoveRightIcon,
  MusicNote01Icon as HMusicNote01Icon,
  Notification01Icon as HNotification01Icon,
  NotificationBubbleIcon as HNotificationBubbleIcon,
  NotificationOff01Icon as HNotificationOff01Icon,
  Package01Icon as HPackage01Icon,
  PackageIcon as HPackageIcon,
  PanelLeftIcon as HPanelLeftIcon,
  PanelRightCloseIcon as HPanelRightCloseIcon,
  PanelRightOpenIcon as HPanelRightOpenIcon,
  PauseCircleIcon as HPauseCircleIcon,
  PauseIcon as HPauseIcon,
  PenTool01Icon as HPenTool01Icon,
  PencilEdit01Icon as HPencilEdit01Icon,
  PencilEdit02Icon as HPencilEdit02Icon,
  PencilIcon as HPencilIcon,
  PercentIcon as HPercentIcon,
  PieChartIcon as HPieChartIcon,
  PinIcon as HPinIcon,
  PlayIcon as HPlayIcon,
  Plug01Icon as HPlug01Icon,
  PowerServiceIcon as HPowerServiceIcon,
  PuzzleIcon as HPuzzleIcon,
  QrCodeIcon as HQrCodeIcon,
  RefreshIcon as HRefreshIcon,
  RepeatIcon as HRepeatIcon,
  RotateLeft01Icon as HRotateLeft01Icon,
  Route01Icon as HRoute01Icon,
  ScrollIcon as HScrollIcon,
  Search01Icon as HSearch01Icon,
  SearchMinusIcon as HSearchMinusIcon,
  SecurityCheckIcon as HSecurityCheckIcon,
  ServerStack01Icon as HServerStack01Icon,
  Settings01Icon as HSettings01Icon,
  Settings02Icon as HSettings02Icon,
  Share02Icon as HShare02Icon,
  Shield01Icon as HShield01Icon,
  Shield02Icon as HShield02Icon,
  ShoppingBag01Icon as HShoppingBag01Icon,
  ShoppingCart01Icon as HShoppingCart01Icon,
  SlidersHorizontalIcon as HSlidersHorizontalIcon,
  SmartPhone01Icon as HSmartPhone01Icon,
  SmileIcon as HSmileIcon,
  SolidLine02Icon as HSolidLine02Icon,
  SourceCodeIcon as HSourceCodeIcon,
  SparklesIcon as HSparklesIcon,
  SplitIcon as HSplitIcon,
  SquareUnlock01Icon as HSquareUnlock01Icon,
  StarIcon as HStarIcon,
  StethoscopeIcon as HStethoscopeIcon,
  StickyNote01Icon as HStickyNote01Icon,
  StopCircleIcon as HStopCircleIcon,
  Sun01Icon as HSun01Icon,
  TableIcon as HTableIcon,
  Tag01Icon as HTag01Icon,
  TagsIcon as HTagsIcon,
  Target01Icon as HTarget01Icon,
  TaskDone01Icon as HTaskDone01Icon,
  TestTubeIcon as HTestTubeIcon,
  TextBoldIcon as HTextBoldIcon,
  TextIcon as HTextIcon,
  TextItalicIcon as HTextItalicIcon,
  Tick01Icon as HTick01Icon,
  TickDouble01Icon as HTickDouble01Icon,
  TimeScheduleIcon as HTimeScheduleIcon,
  Timer01Icon as HTimer01Icon,
  UnavailableIcon as HUnavailableIcon,
  Upload01Icon as HUpload01Icon,
  UsbIcon as HUsbIcon,
  UserAdd01Icon as HUserAdd01Icon,
  UserCheck01Icon as HUserCheck01Icon,
  UserCircleIcon as HUserCircleIcon,
  UserGroupIcon as HUserGroupIcon,
  UserIcon as HUserIcon,
  UserMultipleIcon as HUserMultipleIcon,
  UserRemove01Icon as HUserRemove01Icon,
  UserSettings01Icon as HUserSettings01Icon,
  VariableIcon as HVariableIcon,
  Video01Icon as HVideo01Icon,
  ViewIcon as HViewIcon,
  ViewOffIcon as HViewOffIcon,
  Volume02Icon as HVolume02Icon,
  VolumeIcon as HVolumeIcon,
  Wallet01Icon as HWallet01Icon,
  WebhookIcon as HWebhookIcon,
  WorkHistoryIcon as HWorkHistoryIcon,
  WorkflowCircle01Icon as HWorkflowCircle01Icon,
  Wrench01Icon as HWrench01Icon,
  Xls01Icon as HXls01Icon,
  ZoomInAreaIcon as HZoomInAreaIcon,
  ZoomOutAreaIcon as HZoomOutAreaIcon,
} from '@hugeicons/core-free-icons';

export type IconProps = Omit<SVGProps<SVGSVGElement>, 'ref'> & {
  size?: number | string;
  strokeWidth?: number;
  absoluteStrokeWidth?: boolean;
};

/** Same role as Lucide's type: any icon component from this module. */
export type LucideIcon = ComponentType<IconProps>;
export type AppIcon = LucideIcon;

const icon = (svg: IconSvgElement, name: string) => {
  const Icon = forwardRef<SVGSVGElement, IconProps>(({ size = 24, strokeWidth = 1.75, ...props }, ref) => (
    <HugeiconsIcon ref={ref} icon={svg} size={size} strokeWidth={strokeWidth} aria-hidden={props['aria-label'] ? undefined : true} {...props} />
  ));
  Icon.displayName = name;
  return Icon;
};

export const Activity = icon(HActivity01Icon, 'Activity');
export const AlertCircle = icon(HAlertCircleIcon, 'AlertCircle');
export const AlertTriangle = icon(HAlert02Icon, 'AlertTriangle');
export const Archive = icon(HArchiveIcon, 'Archive');
export const ArrowDown = icon(HArrowDown01Icon, 'ArrowDown');
export const ArrowDownRight = icon(HArrowDownRight01Icon, 'ArrowDownRight');
export const ArrowLeft = icon(HArrowLeft01Icon, 'ArrowLeft');
export const ArrowLeftRight = icon(HArrowLeftRightIcon, 'ArrowLeftRight');
export const ArrowRight = icon(HArrowRight01Icon, 'ArrowRight');
export const ArrowUp = icon(HArrowUp01Icon, 'ArrowUp');
export const ArrowUpDown = icon(HArrowUpDownIcon, 'ArrowUpDown');
export const ArrowUpRight = icon(HArrowUpRight01Icon, 'ArrowUpRight');
export const Award = icon(HAward01Icon, 'Award');
export const BadgeDollarSign = icon(HDollarCircleIcon, 'BadgeDollarSign');
export const Ban = icon(HUnavailableIcon, 'Ban');
export const BarChart3 = icon(HChartColumnIcon, 'BarChart3');
export const Bell = icon(HNotification01Icon, 'Bell');
export const BellOff = icon(HNotificationOff01Icon, 'BellOff');
export const BellRing = icon(HNotificationBubbleIcon, 'BellRing');
export const Bold = icon(HTextBoldIcon, 'Bold');
export const BookOpen = icon(HBookOpen01Icon, 'BookOpen');
export const Bot = icon(HBotIcon, 'Bot');
export const Boxes = icon(HPackage01Icon, 'Boxes');
export const Braces = icon(HFirstBracketIcon, 'Braces');
export const Brain = icon(HBrainIcon, 'Brain');
export const Briefcase = icon(HBriefcase01Icon, 'Briefcase');
export const Building = icon(HBuilding01Icon, 'Building');
export const Building2 = icon(HBuilding02Icon, 'Building2');
export const Cable = icon(HUsbIcon, 'Cable');
export const Calendar = icon(HCalendar01Icon, 'Calendar');
export const CalendarCheck = icon(HCalendarCheckIn01Icon, 'CalendarCheck');
export const CalendarClock = icon(HTimeScheduleIcon, 'CalendarClock');
export const CalendarDays = icon(HCalendar02Icon, 'CalendarDays');
export const CalendarIcon = icon(HCalendar01Icon, 'CalendarIcon');
export const CalendarRange = icon(HCalendar03Icon, 'CalendarRange');
export const CalendarSearch = icon(HCalendarSetting01Icon, 'CalendarSearch');
export const CalendarX2 = icon(HCalendarRemove02Icon, 'CalendarX2');
export const Camera = icon(HCamera01Icon, 'Camera');
export const Check = icon(HTick01Icon, 'Check');
export const CheckCheck = icon(HTickDouble01Icon, 'CheckCheck');
export const CheckCircle = icon(HCheckmarkCircle01Icon, 'CheckCircle');
export const CheckCircle2 = icon(HCheckmarkCircle02Icon, 'CheckCircle2');
export const CheckSquare = icon(HCheckmarkSquare01Icon, 'CheckSquare');
export const ChevronDown = icon(HArrowDown01Icon, 'ChevronDown');
export const ChevronDownIcon = icon(HArrowDown01Icon, 'ChevronDownIcon');
export const ChevronLeft = icon(HArrowLeft01Icon, 'ChevronLeft');
export const ChevronLeftIcon = icon(HArrowLeft01Icon, 'ChevronLeftIcon');
export const ChevronRight = icon(HArrowRight01Icon, 'ChevronRight');
export const ChevronRightIcon = icon(HArrowRight01Icon, 'ChevronRightIcon');
export const ChevronUp = icon(HArrowUp01Icon, 'ChevronUp');
export const ChevronUpIcon = icon(HArrowUp01Icon, 'ChevronUpIcon');
export const ChevronsUpDown = icon(HArrowUpDownIcon, 'ChevronsUpDown');
export const ChevronsUpDownIcon = icon(HArrowUpDownIcon, 'ChevronsUpDownIcon');
export const CircleAlert = icon(HAlertCircleIcon, 'CircleAlert');
export const CircleAlertIcon = icon(HAlertCircleIcon, 'CircleAlertIcon');
export const CircleCheck = icon(HCheckmarkCircle01Icon, 'CircleCheck');
export const CircleCheckIcon = icon(HCheckmarkCircle01Icon, 'CircleCheckIcon');
export const CircleDollarSign = icon(HDollarCircleIcon, 'CircleDollarSign');
export const CircleHelp = icon(HHelpCircleIcon, 'CircleHelp');
export const ClipboardList = icon(HCheckListIcon, 'ClipboardList');
export const Clock = icon(HClock01Icon, 'Clock');
export const Cloud = icon(HCloudIcon, 'Cloud');
export const Code = icon(HCodeIcon, 'Code');
export const Code2 = icon(HSourceCodeIcon, 'Code2');
export const Cog = icon(HSettings01Icon, 'Cog');
export const Columns3 = icon(HLayout3ColumnIcon, 'Columns3');
export const Contact = icon(HContactIcon, 'Contact');
export const Copy = icon(HCopy01Icon, 'Copy');
export const CopyPlus = icon(HCopy01Icon, 'CopyPlus');
export const CornerDownRight = icon(HArrowTurnDownIcon, 'CornerDownRight');
export const CornerUpLeft = icon(HArrowTurnUpIcon, 'CornerUpLeft');
export const DollarSign = icon(HDollar01Icon, 'DollarSign');
export const Download = icon(HDownload01Icon, 'Download');
export const Edit = icon(HEdit01Icon, 'Edit');
export const Edit2 = icon(HPencilEdit01Icon, 'Edit2');
export const Edit3 = icon(HPencilEdit02Icon, 'Edit3');
export const ExternalLink = icon(HArrowUpRight01Icon, 'ExternalLink');
export const Eye = icon(HViewIcon, 'Eye');
export const EyeOff = icon(HViewOffIcon, 'EyeOff');
export const Facebook = icon(HFacebook01Icon, 'Facebook');
export const File = icon(HFile01Icon, 'File');
export const FileArchive = icon(HFileZipIcon, 'FileArchive');
export const FilePlus = icon(HFileAddIcon, 'FilePlus');
export const FileSpreadsheet = icon(HXls01Icon, 'FileSpreadsheet');
export const FileText = icon(HFile02Icon, 'FileText');
export const FileUp = icon(HFileUploadIcon, 'FileUp');
export const FileVideo = icon(HFileVideoIcon, 'FileVideo');
export const Film = icon(HFilm01Icon, 'Film');
export const Filter = icon(HFilterIcon, 'Filter');
export const Fingerprint = icon(HFingerPrintIcon, 'Fingerprint');
export const FlaskConical = icon(HTestTubeIcon, 'FlaskConical');
export const Frown = icon(HFrownIcon, 'Frown');
export const GitBranch = icon(HGitBranchIcon, 'GitBranch');
export const GitFork = icon(HGitForkIcon, 'GitFork');
export const Globe = icon(HGlobeIcon, 'Globe');
export const Grid3X3 = icon(HGridIcon, 'Grid3X3');
export const GripVertical = icon(HDrag01Icon, 'GripVertical');
export const HardDrive = icon(HHardDriveIcon, 'HardDrive');
export const Hash = icon(HHashtagIcon, 'Hash');
export const HelpCircle = icon(HHelpCircleIcon, 'HelpCircle');
export const History = icon(HWorkHistoryIcon, 'History');
export const Home = icon(HHome01Icon, 'Home');
export const Image = icon(HImage01Icon, 'Image');
export const ImageIcon = icon(HImage01Icon, 'ImageIcon');
export const ImageOff = icon(HImageNotFound01Icon, 'ImageOff');
export const Inbox = icon(HInboxIcon, 'Inbox');
export const Info = icon(HInformationCircleIcon, 'Info');
export const InfoIcon = icon(HInformationCircleIcon, 'InfoIcon');
export const Instagram = icon(HInstagramIcon, 'Instagram');
export const Italic = icon(HTextItalicIcon, 'Italic');
export const Key = icon(HKey01Icon, 'Key');
export const Keyboard = icon(HKeyboardIcon, 'Keyboard');
export const Layers = icon(HLayers01Icon, 'Layers');
export const LayoutGrid = icon(HLayoutGridIcon, 'LayoutGrid');
export const LayoutTemplate = icon(HLayout01Icon, 'LayoutTemplate');
export const Library = icon(HLibraryIcon, 'Library');
export const Lightbulb = icon(HBulbIcon, 'Lightbulb');
export const Link2 = icon(HLink02Icon, 'Link2');
export const List = icon(HListViewIcon, 'List');
export const ListCheck = icon(HTaskDone01Icon, 'ListCheck');
export const ListChecks = icon(HCheckListIcon, 'ListChecks');
export const ListFilter = icon(HFilterIcon, 'ListFilter');
export const ListTodo = icon(HCheckListIcon, 'ListTodo');
export const Loader2 = icon(HLoading03Icon, 'Loader2');
export const Loader2Icon = icon(HLoading03Icon, 'Loader2Icon');
export const LoaderCircleIcon = icon(HLoading03Icon, 'LoaderCircleIcon');
export const Lock = icon(HLockIcon, 'Lock');
export const LockIcon = icon(HLockIcon, 'LockIcon');
export const LockOpen = icon(HSquareUnlock01Icon, 'LockOpen');
export const LogIn = icon(HLogin01Icon, 'LogIn');
export const LogOut = icon(HLogout01Icon, 'LogOut');
export const Mail = icon(HMail01Icon, 'Mail');
export const MailOpen = icon(HMailOpen01Icon, 'MailOpen');
export const Map = icon(HMapsIcon, 'Map');
export const MapPin = icon(HLocation01Icon, 'MapPin');
export const MapPinOff = icon(HLocationOffline01Icon, 'MapPinOff');
export const Maximize = icon(HMaximize01Icon, 'Maximize');
export const Maximize2 = icon(HMaximize02Icon, 'Maximize2');
export const Megaphone = icon(HMegaphone01Icon, 'Megaphone');
export const Meh = icon(HMehIcon, 'Meh');
export const Menu = icon(HMenu01Icon, 'Menu');
export const Merge = icon(HGitMergeIcon, 'Merge');
export const MessageCircle = icon(HBubbleChatIcon, 'MessageCircle');
export const MessageSquare = icon(HMessage01Icon, 'MessageSquare');
export const MessageSquareIcon = icon(HMessage01Icon, 'MessageSquareIcon');
export const MessageSquarePlus = icon(HMessageAdd01Icon, 'MessageSquarePlus');
export const MessageSquareReply = icon(HMessageSquareReplyIcon, 'MessageSquareReply');
export const MessageSquareText = icon(HMessage02Icon, 'MessageSquareText');
export const MessagesSquare = icon(HMessageMultiple01Icon, 'MessagesSquare');
export const Mic = icon(HMic01Icon, 'Mic');
export const Minimize2 = icon(HMinimize02Icon, 'Minimize2');
export const Minus = icon(HMinusSignIcon, 'Minus');
export const MinusIcon = icon(HMinusSignIcon, 'MinusIcon');
export const Monitor = icon(HComputerIcon, 'Monitor');
export const Moon = icon(HMoonIcon, 'Moon');
export const MoreHorizontal = icon(HMoreHorizontalIcon, 'MoreHorizontal');
export const MoreHorizontalIcon = icon(HMoreHorizontalIcon, 'MoreHorizontalIcon');
export const MoreVertical = icon(HMoreVerticalIcon, 'MoreVertical');
export const MousePointerClick = icon(HCursorPointer02Icon, 'MousePointerClick');
export const MoveRight = icon(HMoveRightIcon, 'MoveRight');
export const Music = icon(HMusicNote01Icon, 'Music');
export const Network = icon(HAiNetworkIcon, 'Network');
export const Package = icon(HPackageIcon, 'Package');
export const PanelLeftIcon = icon(HPanelLeftIcon, 'PanelLeftIcon');
export const PanelRightClose = icon(HPanelRightCloseIcon, 'PanelRightClose');
export const PanelRightOpen = icon(HPanelRightOpenIcon, 'PanelRightOpen');
export const Paperclip = icon(HAttachmentIcon, 'Paperclip');
export const PaperclipIcon = icon(HAttachmentIcon, 'PaperclipIcon');
export const Pause = icon(HPauseIcon, 'Pause');
export const PauseCircle = icon(HPauseCircleIcon, 'PauseCircle');
export const PenLine = icon(HPenTool01Icon, 'PenLine');
export const PenTool = icon(HPenTool01Icon, 'PenTool');
export const Pencil = icon(HPencilIcon, 'Pencil');
export const Percent = icon(HPercentIcon, 'Percent');
export const Phone = icon(HSmartPhone01Icon, 'Phone');
export const PieChart = icon(HPieChartIcon, 'PieChart');
export const PiggyBank = icon(HMoneySavingJarIcon, 'PiggyBank');
export const Pin = icon(HPinIcon, 'Pin');
export const Play = icon(HPlayIcon, 'Play');
export const Plug = icon(HPlug01Icon, 'Plug');
export const PlugZap = icon(HElectricPlugsIcon, 'PlugZap');
export const Plus = icon(HAdd01Icon, 'Plus');
export const PlusIcon = icon(HAdd01Icon, 'PlusIcon');
export const Power = icon(HPowerServiceIcon, 'Power');
export const Puzzle = icon(HPuzzleIcon, 'Puzzle');
export const QrCode = icon(HQrCodeIcon, 'QrCode');
export const Receipt = icon(HInvoice01Icon, 'Receipt');
export const RefreshCw = icon(HRefreshIcon, 'RefreshCw');
export const Repeat = icon(HRepeatIcon, 'Repeat');
export const Reply = icon(HMailReply01Icon, 'Reply');
export const RotateCcw = icon(HRotateLeft01Icon, 'RotateCcw');
export const Route = icon(HRoute01Icon, 'Route');
export const Save = icon(HFloppyDiskIcon, 'Save');
export const ScrollText = icon(HScrollIcon, 'ScrollText');
export const Search = icon(HSearch01Icon, 'Search');
export const SearchIcon = icon(HSearch01Icon, 'SearchIcon');
export const SearchX = icon(HSearchMinusIcon, 'SearchX');
export const Send = icon(HMailSend01Icon, 'Send');
export const SendHorizontal = icon(HMailSend01Icon, 'SendHorizontal');
export const Server = icon(HServerStack01Icon, 'Server');
export const Settings = icon(HSettings01Icon, 'Settings');
export const Settings2 = icon(HSettings02Icon, 'Settings2');
export const Share2 = icon(HShare02Icon, 'Share2');
export const Sheet = icon(HGridTableIcon, 'Sheet');
export const Shield = icon(HShield01Icon, 'Shield');
export const ShieldAlert = icon(HShield01Icon, 'ShieldAlert');
export const ShieldCheck = icon(HSecurityCheckIcon, 'ShieldCheck');
export const ShieldX = icon(HShield02Icon, 'ShieldX');
export const ShoppingBag = icon(HShoppingBag01Icon, 'ShoppingBag');
export const ShoppingCart = icon(HShoppingCart01Icon, 'ShoppingCart');
export const SkipForward = icon(HForward01Icon, 'SkipForward');
export const SlidersHorizontal = icon(HSlidersHorizontalIcon, 'SlidersHorizontal');
export const Smartphone = icon(HSmartPhone01Icon, 'Smartphone');
export const Smile = icon(HSmileIcon, 'Smile');
export const Sparkles = icon(HSparklesIcon, 'Sparkles');
export const Split = icon(HSplitIcon, 'Split');
export const Square = icon(HSolidLine02Icon, 'Square');
export const SquareKanban = icon(HKanbanIcon, 'SquareKanban');
export const Star = icon(HStarIcon, 'Star');
export const Stethoscope = icon(HStethoscopeIcon, 'Stethoscope');
export const StickyNote = icon(HStickyNote01Icon, 'StickyNote');
export const StopCircle = icon(HStopCircleIcon, 'StopCircle');
export const Sun = icon(HSun01Icon, 'Sun');
export const Table = icon(HTableIcon, 'Table');
export const Tag = icon(HTag01Icon, 'Tag');
export const Tags = icon(HTagsIcon, 'Tags');
export const Target = icon(HTarget01Icon, 'Target');
export const TestTube = icon(HTestTubeIcon, 'TestTube');
export const Timer = icon(HTimer01Icon, 'Timer');
export const Trash = icon(HDelete01Icon, 'Trash');
export const Trash2 = icon(HDelete02Icon, 'Trash2');
export const TrashIcon = icon(HDelete01Icon, 'TrashIcon');
export const TrendingUp = icon(HAnalyticsUpIcon, 'TrendingUp');
export const TriangleAlert = icon(HAlert02Icon, 'TriangleAlert');
export const TriangleAlertIcon = icon(HAlert02Icon, 'TriangleAlertIcon');
export const Trophy = icon(HChampionIcon, 'Trophy');
export const Type = icon(HTextIcon, 'Type');
export const Upload = icon(HUpload01Icon, 'Upload');
export const User = icon(HUserIcon, 'User');
export const UserCheck = icon(HUserCheck01Icon, 'UserCheck');
export const UserCog = icon(HUserSettings01Icon, 'UserCog');
export const UserPlus = icon(HUserAdd01Icon, 'UserPlus');
export const UserRound = icon(HUserCircleIcon, 'UserRound');
export const UserX = icon(HUserRemove01Icon, 'UserX');
export const Users = icon(HUserMultipleIcon, 'Users');
export const Users2 = icon(HUserGroupIcon, 'Users2');
export const Variable = icon(HVariableIcon, 'Variable');
export const Video = icon(HVideo01Icon, 'Video');
export const Volume2 = icon(HVolume02Icon, 'Volume2');
export const VolumeX = icon(HVolumeIcon, 'VolumeX');
export const Wallet = icon(HWallet01Icon, 'Wallet');
export const Wand = icon(HMagicWand01Icon, 'Wand');
export const Wand2 = icon(HMagicWand01Icon, 'Wand2');
export const Webhook = icon(HWebhookIcon, 'Webhook');
export const Workflow = icon(HWorkflowCircle01Icon, 'Workflow');
export const Wrench = icon(HWrench01Icon, 'Wrench');
export const X = icon(HCancel01Icon, 'X');
export const XCircle = icon(HCancelCircleIcon, 'XCircle');
export const XIcon = icon(HCancel01Icon, 'XIcon');
export const Zap = icon(HFlashIcon, 'Zap');
export const ZoomIn = icon(HZoomInAreaIcon, 'ZoomIn');
export const ZoomOut = icon(HZoomOutAreaIcon, 'ZoomOut');
