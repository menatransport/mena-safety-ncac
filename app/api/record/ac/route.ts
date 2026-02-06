import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const queryString = searchParams.toString();
    // const apiUrl = `${process.env.ac_url}${queryString ? `?${queryString}` : ''}`;
    const apiUrl = `${process.env.ac_url}${queryString ? `?${queryString}` : ''}`;

    const res = await fetch(apiUrl, {
      method: 'GET',
      headers: {  
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`API responded with status: ${res.status}`);
    }

    const data = await res.json();
    // console.log('API response data:', data);

   
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET DB API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}