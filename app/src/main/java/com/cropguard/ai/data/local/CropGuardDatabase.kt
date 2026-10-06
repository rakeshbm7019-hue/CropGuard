package com.cropguard.ai.data.local

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "scan_history")
data class ScanHistoryEntity(
    @PrimaryKey val id: String,
    val crop: String,
    val scientificCropName: String,
    val diseaseName: String,
    val threatType: String,
    val isHealthy: Boolean,
    val confidence: Int,
    val severity: String,
    val symptomsJoined: String,
    val organicTreatmentJoined: String,
    val chemicalTreatmentJoined: String,
    val recommendedChemicalName: String,
    val dosagePerLiter: Double,
    val dosageUnit: String,
    val phiDays: Int,
    val fertilizerAdvice: String,
    val preventiveMeasuresJoined: String,
    val urgencyNote: String,
    val scannedAt: String,
    val location: String,
    val timestampMillis: Long = System.currentTimeMillis()
)

@Entity(tableName = "outbreak_reports")
data class OutbreakReportEntity(
    @PrimaryKey val id: String,
    val crop: String,
    val threatName: String,
    val threatType: String,
    val severity: String,
    val village: String,
    val district: String,
    val state: String,
    val affectedAcres: Int,
    val recommendedAction: String,
    val preventiveSpray: String,
    val reportedAgo: String,
    val timestampMillis: Long = System.currentTimeMillis()
)

@Dao
interface ScanHistoryDao {
    @Query("SELECT * FROM scan_history ORDER BY timestampMillis DESC")
    fun getAllScans(): Flow<List<ScanHistoryEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertScan(scan: ScanHistoryEntity)

    @Query("DELETE FROM scan_history WHERE id = :id")
    suspend fun deleteScanById(id: String)

    @Query("DELETE FROM scan_history")
    suspend fun clearAllScans()
}

@Dao
interface OutbreakReportDao {
    @Query("SELECT * FROM outbreak_reports ORDER BY timestampMillis DESC")
    fun getAllReports(): Flow<List<OutbreakReportEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertReport(report: OutbreakReportEntity)
}

@Database(
    entities = [ScanHistoryEntity::class, OutbreakReportEntity::class],
    version = 1,
    exportSchema = false
)
abstract class CropGuardDatabase : RoomDatabase() {
    abstract fun scanHistoryDao(): ScanHistoryDao
    abstract fun outbreakReportDao(): OutbreakReportDao

    companion object {
        @Volatile
        private var INSTANCE: CropGuardDatabase? = null

        fun getInstance(context: Context): CropGuardDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    CropGuardDatabase::class.java,
                    "cropguard_local.db"
                )
                    .fallbackToDestructiveMigration(true)
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
