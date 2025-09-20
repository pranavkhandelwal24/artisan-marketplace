"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function MyStoryPage() {
    const { user } = useAuth();
    const [story, setStory] = useState('');
    const [initialStory, setInitialStory] = useState(''); // To compare for changes
    const [aiLoading, setAiLoading] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Fetch the user's existing story when the component mounts
    useEffect(() => {
        if (user) {
            const fetchStory = async () => {
                const userDocRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(userDocRef);
                if (docSnap.exists() && docSnap.data().artisanStory) {
                    const savedStory = docSnap.data().artisanStory;
                    setStory(savedStory);
                    setInitialStory(savedStory);
                }
            };
            fetchStory();
        }
    }, [user]);

    const handleEnhanceStory = async () => {
        if (!story) {
            setError('Please write a little about yourself before enhancing.');
            return;
        }
        setAiLoading(true);
        setError('');
        setSuccessMessage('');

        try {
            const response = await fetch('/api/ai/enhance-story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ story }),
            });

            if (!response.ok) {
                throw new Error('Failed to get a response from the AI.');
            }

            const data = await response.json();
            setStory(data.enhancedStory);

        } catch (e: any) {
            console.error(e);
            setError(e.message || 'An error occurred while enhancing the story.');
        } finally {
            setAiLoading(false);
        }
    };

    const handleSaveChanges = async () => {
        if (!user) {
            setError('You must be logged in to save changes.');
            return;
        }
        setSaveLoading(true);
        setError('');
        setSuccessMessage('');

        try {
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, {
                artisanStory: story,
            });
            setInitialStory(story); // Update the initial state to the new saved state
            setSuccessMessage('Your story has been saved successfully!');
            setTimeout(() => setSuccessMessage(''), 3000); // Hide message after 3 seconds
        } catch (e) {
            console.error('Error saving story:', e);
            setError('Failed to save your story. Please try again.');
        } finally {
            setSaveLoading(false);
        }
    };

    return (
        <div className="flex flex-1 flex-col gap-4">
            <div className="flex items-center">
                <h1 className="text-lg font-semibold md:text-2xl">My Artisan Story</h1>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Share Your Journey</CardTitle>
                    <CardDescription>
                        Your story connects you with your customers. Write about your passion, your craft, and what inspires you. Our AI can help you polish your narrative.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                    <div className="grid gap-3">
                        <Label htmlFor="artisan-story">Your Story</Label>
                        <Textarea
                            id="artisan-story"
                            className="min-h-[300px]"
                            placeholder="Tell us about your craft, your inspiration, and your journey as an artisan..."
                            value={story}
                            onChange={(e) => setStory(e.target.value)}
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    {successMessage && <p className="flex items-center text-green-600 text-sm"><CheckCircle className="mr-2 h-4 w-4" />{successMessage}</p>}
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Button onClick={handleEnhanceStory} disabled={aiLoading || saveLoading} variant="outline">
                            {aiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            Enhance with AI
                        </Button>
                        <Button onClick={handleSaveChanges} disabled={saveLoading || story === initialStory}>
                           {saveLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                           {saveLoading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

