import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

const DummyComponent = () => <div>Hello Test</div>;

describe('Frontend Component Tests', () => {
    it('should render the dummy component', () => {
        render(<DummyComponent />);
        expect(screen.getByText('Hello Test')).toBeInTheDocument();
    });
});
