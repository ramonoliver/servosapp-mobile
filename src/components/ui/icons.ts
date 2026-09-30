// Ícones do app — Phosphor, a mesma família do web. Só os usados, num lugar.
// O Phosphor tipa `color` como string, mas desenha com react-native-svg, que
// aceita as cores dinâmicas do modo escuro (DynamicColorIOS). Aqui o tipo
// passa a aceitar qualquer ColorValue.
import type { ComponentType } from "react";
import type { ColorValue } from "react-native";
import {
  ArrowDownIcon as PArrowDownIcon,
  ArrowRightIcon as PArrowRightIcon,
  ArrowUpIcon as PArrowUpIcon,
  ArrowsClockwiseIcon as PArrowsClockwiseIcon,
  ArrowsDownUpIcon as PArrowsDownUpIcon,
  ArrowsLeftRightIcon as PArrowsLeftRightIcon,
  BellIcon as PBellIcon,
  BookmarkSimpleIcon as PBookmarkSimpleIcon,
  CalendarBlankIcon as PCalendarBlankIcon,
  CalendarCheckIcon as PCalendarCheckIcon,
  CalendarPlusIcon as PCalendarPlusIcon,
  CameraIcon as PCameraIcon,
  CaretDownIcon as PCaretDownIcon,
  CaretLeftIcon as PCaretLeftIcon,
  CaretRightIcon as PCaretRightIcon,
  ChartBarHorizontalIcon as PChartBarHorizontalIcon,
  ChatCircleDotsIcon as PChatCircleDotsIcon,
  CheckCircleIcon as PCheckCircleIcon,
  CheckIcon as PCheckIcon,
  ChurchIcon as PChurchIcon,
  ClockCounterClockwiseIcon as PClockCounterClockwiseIcon,
  ClockIcon as PClockIcon,
  CloudSlashIcon as PCloudSlashIcon,
  CopyIcon as PCopyIcon,
  CrownSimpleIcon as PCrownSimpleIcon,
  EnvelopeSimpleIcon as PEnvelopeSimpleIcon,
  EyeIcon as PEyeIcon,
  EyeSlashIcon as PEyeSlashIcon,
  FileTextIcon as PFileTextIcon,
  GoogleLogoIcon as PGoogleLogoIcon,
  HandsPrayingIcon as PHandsPrayingIcon,
  ImageIcon as PImageIcon,
  InfoIcon as PInfoIcon,
  ListChecksIcon as PListChecksIcon,
  LockSimpleIcon as PLockSimpleIcon,
  MagnifyingGlassIcon as PMagnifyingGlassIcon,
  MapPinIcon as PMapPinIcon,
  MusicNotesIcon as PMusicNotesIcon,
  NoteIcon as PNoteIcon,
  PaperPlaneRightIcon as PPaperPlaneRightIcon,
  PaperPlaneTiltIcon as PPaperPlaneTiltIcon,
  PaperclipIcon as PPaperclipIcon,
  PencilSimpleIcon as PPencilSimpleIcon,
  PhoneIcon as PPhoneIcon,
  PlusIcon as PPlusIcon,
  ProhibitIcon as PProhibitIcon,
  ProhibitInsetIcon as PProhibitInsetIcon,
  QuestionIcon as PQuestionIcon,
  ShareNetworkIcon as PShareNetworkIcon,
  SignOutIcon as PSignOutIcon,
  SlidersHorizontalIcon as PSlidersHorizontalIcon,
  TrashIcon as PTrashIcon,
  UserIcon as PUserIcon,
  UserMinusIcon as PUserMinusIcon,
  UserPlusIcon as PUserPlusIcon,
  UsersThreeIcon as PUsersThreeIcon,
  WarningCircleIcon as PWarningCircleIcon,
  XCircleIcon as PXCircleIcon,
  XIcon as PXIcon,
  YoutubeLogoIcon as PYoutubeLogoIcon,
  type IconProps as PhosphorProps,
} from "phosphor-react-native";

export type IconProps = Omit<PhosphorProps, "color" | "duotoneColor"> & { color?: ColorValue; duotoneColor?: ColorValue };
export type Icon = ComponentType<IconProps>;

const dyn = (c: ComponentType<PhosphorProps>) => c as unknown as Icon;

export const ArrowDownIcon = dyn(PArrowDownIcon);
export const ArrowRightIcon = dyn(PArrowRightIcon);
export const ArrowUpIcon = dyn(PArrowUpIcon);
export const ArrowsClockwiseIcon = dyn(PArrowsClockwiseIcon);
export const ArrowsDownUpIcon = dyn(PArrowsDownUpIcon);
export const ArrowsLeftRightIcon = dyn(PArrowsLeftRightIcon);
export const BellIcon = dyn(PBellIcon);
export const BookmarkSimpleIcon = dyn(PBookmarkSimpleIcon);
export const CalendarBlankIcon = dyn(PCalendarBlankIcon);
export const CalendarCheckIcon = dyn(PCalendarCheckIcon);
export const CalendarPlusIcon = dyn(PCalendarPlusIcon);
export const CameraIcon = dyn(PCameraIcon);
export const CaretDownIcon = dyn(PCaretDownIcon);
export const CaretLeftIcon = dyn(PCaretLeftIcon);
export const CaretRightIcon = dyn(PCaretRightIcon);
export const ChartBarHorizontalIcon = dyn(PChartBarHorizontalIcon);
export const ChatCircleDotsIcon = dyn(PChatCircleDotsIcon);
export const CheckCircleIcon = dyn(PCheckCircleIcon);
export const CheckIcon = dyn(PCheckIcon);
export const ChurchIcon = dyn(PChurchIcon);
export const ClockCounterClockwiseIcon = dyn(PClockCounterClockwiseIcon);
export const ClockIcon = dyn(PClockIcon);
export const CloudSlashIcon = dyn(PCloudSlashIcon);
export const CopyIcon = dyn(PCopyIcon);
export const CrownSimpleIcon = dyn(PCrownSimpleIcon);
export const EnvelopeSimpleIcon = dyn(PEnvelopeSimpleIcon);
export const EyeIcon = dyn(PEyeIcon);
export const EyeSlashIcon = dyn(PEyeSlashIcon);
export const FileTextIcon = dyn(PFileTextIcon);
export const GoogleLogoIcon = dyn(PGoogleLogoIcon);
export const HandsPrayingIcon = dyn(PHandsPrayingIcon);
export const ImageIcon = dyn(PImageIcon);
export const InfoIcon = dyn(PInfoIcon);
export const ListChecksIcon = dyn(PListChecksIcon);
export const LockSimpleIcon = dyn(PLockSimpleIcon);
export const MagnifyingGlassIcon = dyn(PMagnifyingGlassIcon);
export const MapPinIcon = dyn(PMapPinIcon);
export const MusicNotesIcon = dyn(PMusicNotesIcon);
export const NoteIcon = dyn(PNoteIcon);
export const PaperPlaneRightIcon = dyn(PPaperPlaneRightIcon);
export const PaperPlaneTiltIcon = dyn(PPaperPlaneTiltIcon);
export const PaperclipIcon = dyn(PPaperclipIcon);
export const PencilSimpleIcon = dyn(PPencilSimpleIcon);
export const PhoneIcon = dyn(PPhoneIcon);
export const PlusIcon = dyn(PPlusIcon);
export const ProhibitIcon = dyn(PProhibitIcon);
export const ProhibitInsetIcon = dyn(PProhibitInsetIcon);
export const QuestionIcon = dyn(PQuestionIcon);
export const ShareNetworkIcon = dyn(PShareNetworkIcon);
export const SignOutIcon = dyn(PSignOutIcon);
export const SlidersHorizontalIcon = dyn(PSlidersHorizontalIcon);
export const TrashIcon = dyn(PTrashIcon);
export const UserIcon = dyn(PUserIcon);
export const UserMinusIcon = dyn(PUserMinusIcon);
export const UserPlusIcon = dyn(PUserPlusIcon);
export const UsersThreeIcon = dyn(PUsersThreeIcon);
export const WarningCircleIcon = dyn(PWarningCircleIcon);
export const XCircleIcon = dyn(PXCircleIcon);
export const XIcon = dyn(PXIcon);
export const YoutubeLogoIcon = dyn(PYoutubeLogoIcon);
