import math
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlmodel import Session, select, col, func
from calendar import month_name

from be.core.database import get_session
from be.core.security import get_current_active_user
from be.models import User, Profit
from be.schemas import ProfitRecord, ProfitFilters, ProfitPage, ErrorResponse

router = APIRouter(prefix="/profits", tags=["profits"])


@router.get(
    "",
    response_model=ProfitPage,
    responses={
        401: {"model": ErrorResponse, "description": "Not authenticated"},
        403: {"model": ErrorResponse, "description": "Inactive user"},
        422: {"model": ErrorResponse, "description": "Validation Error"}
    }
)
async def get_profits(
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[Session, Depends(get_session)],
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(25, ge=1, le=100, description="Items per page"),
    company: Optional[str] = Query(None, description="Filter by company name"),
    year: Optional[int] = Query(None, ge=2020, le=2030, description="Filter by year"),
    search: Optional[str] = Query(None, max_length=100, description="Search in company name"),
):
    """
    Get paginated profit data with optional filtering and search.
    
    - **page**: Page number (starts from 1)
    - **per_page**: Number of items per page (1-100)
    - **company**: Filter by specific company name
    - **year**: Filter by specific year
    - **search**: Search in company names (case-insensitive)
    
    Returns paginated profit records with metadata.
    """
    
    # Build base query
    query = select(Profit)
    
    # Apply filters
    if company:
        query = query.where(col(Profit.company) == company)
    
    if year:
        query = query.where(col(Profit.year) == year)
    
    if search:
        # Case-insensitive search in company name
        search_term = f"%{search.lower()}%"
        query = query.where(func.lower(col(Profit.company)).like(search_term))
    
    # Order by year desc, month desc, company asc for consistent ordering
    query = query.order_by(
        col(Profit.year).desc(),
        col(Profit.month).desc(),
        col(Profit.company).asc()
    )
    
    # Get total count for pagination
    count_query = select(func.count(Profit.id))
    if company:
        count_query = count_query.where(col(Profit.company) == company)
    if year:
        count_query = count_query.where(col(Profit.year) == year)
    if search:
        search_term = f"%{search.lower()}%"
        count_query = count_query.where(func.lower(col(Profit.company)).like(search_term))
    
    total = session.exec(count_query).one()
    
    # Calculate pagination
    total_pages = math.ceil(total / per_page)
    offset = (page - 1) * per_page
    
    # Apply pagination
    query = query.offset(offset).limit(per_page)
    
    # Execute query
    profits = session.exec(query).all()
    
    # Convert to response format with month names
    profit_records = []
    for profit in profits:
        record = ProfitRecord.model_validate(profit)
        record.month_name = month_name[profit.month]
        profit_records.append(record)
    
    return ProfitPage(
        data=profit_records,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1
    )


@router.get(
    "/companies",
    response_model=list[str],
    responses={
        401: {"model": ErrorResponse, "description": "Not authenticated"},
        403: {"model": ErrorResponse, "description": "Inactive user"}
    }
)
async def get_companies(
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[Session, Depends(get_session)]
):
    """Get list of all unique company names for filtering."""
    companies = session.exec(
        select(Profit.company).distinct().order_by(col(Profit.company))
    ).all()
    return companies


@router.get(
    "/years",
    response_model=list[int],
    responses={
        401: {"model": ErrorResponse, "description": "Not authenticated"},
        403: {"model": ErrorResponse, "description": "Inactive user"}
    }
)
async def get_years(
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[Session, Depends(get_session)]
):
    """Get list of all unique years for filtering."""
    years = session.exec(
        select(Profit.year).distinct().order_by(col(Profit.year).desc())
    ).all()
    return years


@router.get(
    "/stats",
    responses={
        401: {"model": ErrorResponse, "description": "Not authenticated"},
        403: {"model": ErrorResponse, "description": "Inactive user"}
    }
)
async def get_profit_stats(
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[Session, Depends(get_session)]
):
    """Get basic statistics about profit data."""
    total_records = session.exec(select(func.count(Profit.id))).one()
    total_profit = session.exec(select(func.sum(Profit.profit))).one() or 0
    avg_profit = session.exec(select(func.avg(Profit.profit))).one() or 0
    min_profit = session.exec(select(func.min(Profit.profit))).one() or 0
    max_profit = session.exec(select(func.max(Profit.profit))).one() or 0
    
    return {
        "total_records": total_records,
        "total_profit": round(total_profit, 2),
        "average_profit": round(avg_profit, 2),
        "min_profit": round(min_profit, 2),
        "max_profit": round(max_profit, 2)
    } 