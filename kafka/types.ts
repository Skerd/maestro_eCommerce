export type ManagerPinResetEmailEvent = {
    eventType: "manager_pin_reset_email";
    email: string;
    userId: string;
    fullName: string;
    configId: string;
    configName: string;
    resetCode: string;
    languageCode: string;
    timestamp: number;
    companyId?: string;
};
