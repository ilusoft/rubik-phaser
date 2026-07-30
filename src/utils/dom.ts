export function createElement<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    options?: {
        id?: string;
        className?: string;
        text?: string;
        style?: Partial<CSSStyleDeclaration>;
        parent?: HTMLElement;
    }
): HTMLElementTagNameMap[K] {
    const element = document.createElement(tag);

    if (options?.id) {
        element.id = options.id;
    }

    if (options?.className) {
        element.className = options.className;
    }

    if (options?.text) {
        element.textContent = options.text;
    }

    if (options?.style) {
        Object.assign(element.style, options.style);
    }

    if (options?.parent) {
        options.parent.appendChild(element);
    }

    return element;
}

export function removeElement(element: HTMLElement): void {
    if (element.parentNode) {
        element.parentNode.removeChild(element);
    }
}

export function getElementById<T extends HTMLElement>(id: string): T | null {
    return document.getElementById(id) as T | null;
}

export function showElement(element: HTMLElement): void {
    element.style.display = '';
}

export function hideElement(element: HTMLElement): void {
    element.style.display = 'none';
}

export function setElementText(element: HTMLElement, text: string): void {
    element.textContent = text;
}

export function addClass(element: HTMLElement, className: string): void {
    element.classList.add(className);
}

export function removeClass(element: HTMLElement, className: string): void {
    element.classList.remove(className);
}

export function hasClass(element: HTMLElement, className: string): boolean {
    return element.classList.contains(className);
}
