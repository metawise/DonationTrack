import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // In a real deployment, this would trigger a background job
    // For now, we'll call the sync endpoint directly but with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const syncResponse = await fetch(new URL('/api/sync/mywell', request.url).toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!syncResponse.ok) {
        const error = await syncResponse.text();
        console.error('Sync failed:', error);
        return NextResponse.json(
          { success: false, error: 'Sync failed' },
          { status: 500 }
        );
      }

      const result = await syncResponse.json();
      
      return NextResponse.json({
        success: true,
        message: 'Sync completed successfully',
        ...result
      });
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        // Sync is still running, return success
        return NextResponse.json({
          success: true,
          message: 'Sync triggered and running in background',
          status: 'running'
        });
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Error triggering sync:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to trigger sync' },
      { status: 500 }
    );
  }
}