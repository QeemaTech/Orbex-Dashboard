export interface CsCourierMapDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    courierId: string | null;
    token: string;
}
export declare function CsCourierMapDialog({ open, onOpenChange, courierId, token, }: CsCourierMapDialogProps): import("react/jsx-runtime").JSX.Element | null;
