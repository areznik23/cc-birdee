import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsStorage } from '@/lib/services/analytics-storage';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || 'default-user';
    
    const storage = new AnalyticsStorage();
    await storage.initialize();
    
    const profile = await storage.getUserProfile(userId);
    
    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found. Process some sessions first.' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(profile);
    
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId = 'default-user', updates } = await request.json();
    
    if (!updates) {
      return NextResponse.json(
        { error: 'Updates object is required' },
        { status: 400 }
      );
    }
    
    const storage = new AnalyticsStorage();
    await storage.initialize();
    
    await storage.updateUserProfile(userId, updates);
    const updatedProfile = await storage.getUserProfile(userId);
    
    return NextResponse.json(updatedProfile);
    
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: 'Failed to update user profile' },
      { status: 500 }
    );
  }
}