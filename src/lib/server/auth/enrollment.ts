import { db, schema } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { generateSecret, provisioningUri, verifyCode } from './totp';
import { encryptSecret, decryptSecret } from './totp-crypto';
import QRCode from 'qrcode';

/** Begin: store a pending (encrypted) secret, return QR + manual key. */
export async function beginEnrollment(userId: string, accountName: string) {
	const secret = generateSecret();
	await db
		.update(schema.users)
		.set({ totpSecret: encryptSecret(secret), totpEnabledAt: null, totpLastStep: null })
		.where(eq(schema.users.id, userId));
	const uri = provisioningUri(secret, accountName);
	const qr = await QRCode.toDataURL(uri, { margin: 1, width: 220 });
	return { manualKey: secret, qr };
}

/** Confirm: verify a code against the pending secret, enable. */
export async function confirmEnrollment(userId: string, code: string): Promise<boolean> {
	const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
	if (!user?.totpSecret) return false;
	const res = verifyCode(decryptSecret(user.totpSecret), code);
	if (!res.valid) return false;
	await db
		.update(schema.users)
		.set({ totpEnabledAt: new Date(), totpLastStep: res.step })
		.where(eq(schema.users.id, userId));
	return true;
}

/** Disable: verify a fresh code first (caller enforces enforcement policy). */
export async function disableTwoFactor(userId: string, code: string): Promise<boolean> {
	const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
	if (!user?.totpSecret) return false;
	const res = verifyCode(decryptSecret(user.totpSecret), code, {
		lastStep: user.totpLastStep ?? undefined
	});
	if (!res.valid) return false;
	await db
		.update(schema.users)
		.set({ totpSecret: null, totpEnabledAt: null, totpLastStep: null })
		.where(eq(schema.users.id, userId));
	return true;
}

/** Admin reset: no code required (escape hatch). */
export async function adminResetTwoFactor(userId: string): Promise<void> {
	await db
		.update(schema.users)
		.set({ totpSecret: null, totpEnabledAt: null, totpLastStep: null })
		.where(eq(schema.users.id, userId));
}
