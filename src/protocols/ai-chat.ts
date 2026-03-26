import { DomainProtocol } from '../router';

export class AiChatProtocol implements DomainProtocol {
    matches(hostname: string): boolean {
        // gemini.google.com is handled exclusively by GeminiWalkerProtocol (registered first)
        return hostname.includes('chatgpt.com') ||
            hostname.includes('claude.ai');
    }

    handleKey(event: KeyboardEvent, key: string, shift: boolean, container: Element): boolean {
        if (key === 'z') {
            container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
            return true;
        }

        return false;
    }
}
