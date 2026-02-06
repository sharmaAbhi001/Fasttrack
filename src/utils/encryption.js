import crypto from "crypto";


const secretKey = process.env.ENCRYPTION_SECRET_KEY || "default_secret_key"; // Isko environment variable se lena chahiye production mein

const algorithm = 'aes-256-cbc';
const key = crypto.scryptSync(secretKey, 'salt', 32); // 32 bytes key
const iv = crypto.randomBytes(16); // Initialization vector

// Encrypt Function
export const encrypt = (text) => {
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    // IV ko saath mein save karna zaroori hai decrypt karne ke liye
    return `${iv.toString('hex')}:${encrypted}`;
};

export const decrypt = (text) => {
    const [ivHex, encryptedText] = text.split(':');
    const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(ivHex, 'hex'));
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};