"""The seven demo scenarios, shared by demo.py, the API and the tests."""

from dataclasses import dataclass, field
from typing import Optional

from engine import Request


@dataclass(frozen=True)
class Scenario:
    number: int
    title: str
    data_tier: int
    requester: str
    jurisdiction: str
    purpose: str
    location_group: str
    area: Optional[str]
    expected: str
    expected_review: bool = False
    why: str = ""

    def request(self) -> Request:
        return Request(self.data_tier, self.requester, self.jurisdiction, self.purpose,
                       self.location_group, area=self.area)

    def attributes(self) -> dict:
        return {
            "data_tier": self.data_tier,
            "requester": self.requester,
            "jurisdiction": self.jurisdiction,
            "purpose": self.purpose,
            "location_group": self.location_group,
            "area": self.area,
        }


SCENARIOS = [
    Scenario(1, "Mecca case: advertiser asks for device level Mecca visits",
             6, "commercial", "saudi_arabia", "advertising", "G1", "Mecca", "Blocked",
             why="LOC_G1, the audience matrix and ADS_NO_RED_LOCATION_TARGETING all block it"),
    Scenario(2, "Tourism ministry asks for Mecca visitor counts by home country",
             2, "government", "saudi_arabia", "tourism", "G1", "Mecca", "Aggregate",
             why="G1 allows counts above k"),
    Scenario(3, "Advertiser asks for visit history at Dubai malls",
             5, "commercial", "uae", "advertising", "G5", "Dubai", "Masked",
             why="Audience matrix gives commercial Masked device logs; hospital rows are dropped"),
    Scenario(4, "Same advertiser request, but in Thailand",
             5, "commercial", "thailand", "advertising", "G5", "Bangkok", "Aggregate", True,
             why="TH_ADID_DEVICE_LEVEL is a grey area, so it goes to Aggregate and review"),
    Scenario(5, "Internal team, cybersecurity, raw data near a defence site",
             7, "internal", "saudi_arabia", "cybersecurity", "G4", "Riyadh", "Aggregate",
             why="G4 caps even internal requests at Aggregate"),
    Scenario(6, "Research partner asks for movement trends in Doha",
             3, "research", "qatar", "tourism", "G5", "Doha", "Aggregate",
             why="Audience matrix gives research Aggregate for behavioral trends"),
    Scenario(7, "Request from a country with no rules yet",
             2, "government", "brazil", "tourism", "G5", "Riyadh", "Blocked",
             why="Unknown jurisdiction fails safe"),
]
